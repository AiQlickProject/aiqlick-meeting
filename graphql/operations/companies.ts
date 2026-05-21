import { gql } from "@apollo/client";

/**
 * `myCompanies` returns the companies the current user owns or
 * belongs to. The profile switcher in the top bar reads from this
 * list and lets the user toggle between their personal profile and
 * any of these companies.
 *
 * The minimal projection — we only need id, name, and an avatar
 * fallback. The full shape from aiqlick-frontend includes vatNo,
 * category, theme, billing owner etc., but the meeting client
 * doesn't render any of those.
 */
export const GET_MY_COMPANIES = gql`
  query MyCompanies($userId: String!) {
    myCompanies(userId: $userId) {
      id
      companyName
      avatar
    }
  }
`;

export interface MyCompanyItem {
  id: string;
  companyName: string;
  avatar: string | null;
}

export interface MyCompaniesResult {
  myCompanies: MyCompanyItem[];
}

/**
 * `UpdateUser` mutation, used here only to flip `selectedCompanyId`
 * when the user switches profile. The aiqlick-frontend's
 * `UPDATE_PROFILE` mutation takes the same `UpdateUserInput`; we
 * deliberately ship only the field we change.
 */
export const SWITCH_SELECTED_COMPANY = gql`
  mutation SwitchSelectedCompany($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      selectedCompanyId
    }
  }
`;

export interface SwitchSelectedCompanyResult {
  updateUser: {
    id: string;
    selectedCompanyId: string | null;
  };
}
