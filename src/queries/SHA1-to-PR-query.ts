import { gql, TypedDocumentNode } from "@apollo/client/core";
import { client } from "../graphql-client";
import { GetPRForSHA1, GetPRForSHA1Variables } from "./schema/GetPRForSHA1";

export const runQueryToGetPRMetadataForSHA1 = async (owner: string, repo: string, sha1: string) => {
  const info = await client.query({
      query: GetPRForSHA1Query,
      variables: { query: `${sha1} type:pr repo:${owner}/${repo}` },
      fetchPolicy: "network-only",
  });
  const pr = info.data.search.nodes?.[0];
  return pr?.__typename === "PullRequest" ? pr : undefined;
};

export const GetPRForSHA1Query: TypedDocumentNode<GetPRForSHA1, GetPRForSHA1Variables> = gql`
query GetPRForSHA1($query: String!) {
  search(query: $query, first: 1, type: ISSUE) {
    nodes {
      ... on PullRequest {
        title
        number
        closed
      }
    }
  }
}`;

/* This is better since it doesn't do a generic search, but for some reason it will sometime fail to get a PR
query GetPRForSHA1($owner: String!, $repo: String!, $sha1: String!) {
  repository(owner: $owner, name: $repo) {
    id
    object(expression: $sha1) {
      ... on Commit {
        associatedPullRequests(first: 1) {
          nodes {
            title
            number
            closed
          }
        }
      }
    }
  }
}
*/
