import { gql } from "@apollo/client";

/**
 * Auth GraphQL operations. Mirror the document shapes from
 * aiqlick-frontend so the backend resolver matches without any
 * schema work. We deliberately do *not* import the frontend's
 * fragments to keep this app self-contained.
 */

export const SIGN_IN = gql`
  mutation signIn($input: SignInInput!) {
    signIn(input: $input) {
      message
      token
      temporaryToken
    }
  }
`;

export const WHO_AM_I = gql`
  query whoAmI {
    whoAmI {
      id
      selectedCompanyId
      email
      firstName
      lastName
      profileImageUrl
      isSupportAgent
      createdAt
    }
  }
`;

export interface SignInResult {
  signIn: {
    message: string;
    token: string | null;
    temporaryToken: string | null;
  };
}

export interface WhoAmIResult {
  whoAmI: {
    id: string;
    selectedCompanyId: string | null;
    email: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
    isSupportAgent: boolean;
    createdAt: string;
  } | null;
}
