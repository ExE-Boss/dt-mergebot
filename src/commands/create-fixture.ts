import * as computeActions from "../compute-pr-actions";
import { deriveStateForPR, BotResult, queryPRInfo } from "../pr-info";
import { writeFileSync, mkdirSync, existsSync, readJsonSync } from "fs-extra";
import { join } from "path";
import { fetchFile } from "../util/fetchFile";
import { getMonthlyDownloadCount } from "../util/npm";
import { scrubDiagnosticDetails } from "../util/util";
import { executePrActions } from "../execute-pr-actions";

export default async function main(directory: string, overwriteInfo: boolean) {
  const writeJsonSync = (file: string, json: unknown) =>
      writeFileSync(file, scrubDiagnosticDetails(JSON.stringify(json, undefined, 2) + "\n"));

  const fixturePath = join("src", "_tests", "fixtures", directory);
  const prNumber = parseInt(directory, 10);
  if (isNaN(prNumber)) throw new Error(`Expected ${directory} to be parseable as a PR number`);

  if (!existsSync(fixturePath)) mkdirSync(fixturePath);

  const jsonFixturePath = join(fixturePath, "_response.json");
  if (overwriteInfo || !existsSync(jsonFixturePath)) {
    writeJsonSync(jsonFixturePath, await queryPRInfo(prNumber));
  }
  const response = readJsonSync(jsonFixturePath);

  const filesJSONPath = join(fixturePath, "_files.json");
  const filesFetched: {[expr: string]: string | undefined} = {};
  const downloadsJSONPath = join(fixturePath, "_downloads.json");
  const downloadsFetched: {[packageName: string]: number} = {};
  const derivedFixturePath = join(fixturePath, "derived.json");

  const shouldOverwrite = (file: string) => overwriteInfo || !existsSync(file);

  const derivedInfo = await deriveStateForPR(
    response,
    shouldOverwrite(filesJSONPath) ? initFetchFilesAndWriteToFile() : getFilesFromFile,
    shouldOverwrite(downloadsJSONPath) ? initGetDownloadsAndWriteToFile() : getDownloadsFromFile,
    shouldOverwrite(derivedFixturePath) ? undefined : getTimeFromFile(),
  );

  writeJsonSync(derivedFixturePath, derivedInfo);

  if (derivedInfo.type === "fail") return;

  const resultFixturePath = join(fixturePath, "result.json");
  const actions = computeActions.process(derivedInfo);
  writeJsonSync(resultFixturePath, actions);

  const mutationsFixturePath = join(fixturePath, "mutations.json");
  const mutations = await executePrActions(actions, response.data, /*dry*/ true);
  writeJsonSync(mutationsFixturePath, mutations);

  console.log(`Recorded`);

  function initFetchFilesAndWriteToFile() {
    writeJsonSync(filesJSONPath, {}); // one-time initialization of an empty storage
    return fetchFilesAndWriteToFile;
  }
  async function fetchFilesAndWriteToFile(expr: string, limit?: number) {
    filesFetched[expr] = await fetchFile(expr, limit);
    writeJsonSync(filesJSONPath, filesFetched);
    return filesFetched[expr];
  }
  function getFilesFromFile(expr: string) {
    return readJsonSync(filesJSONPath)[expr];
  }

  function initGetDownloadsAndWriteToFile() {
    writeJsonSync(downloadsJSONPath, {}); // one-time initialization of an empty storage
    return getDownloadsAndWriteToFile;
  }
  async function getDownloadsAndWriteToFile(packageName: string, until?: Date) {
    const downloads = await getMonthlyDownloadCount(packageName, until)
    downloadsFetched[packageName] = downloads;
    writeJsonSync(downloadsJSONPath, downloadsFetched);
    return downloads;
  }
  function getDownloadsFromFile(packageName: string) {
    return readJsonSync(downloadsJSONPath)[packageName];
  }

  function getTimeFromFile() {
    return (readJsonSync(derivedFixturePath) as BotResult).now;
  }
}


if (!module.parent) {
  const num = process.argv[2];
  if (!num) {
    console.error("expecting a PR number");
    process.exit(1);
  }
  const overwriteInfo = process.argv.slice(2).includes("--overwrite-info")
  main(num, overwriteInfo).then(() => {
    process.exit(0);
  });
}
