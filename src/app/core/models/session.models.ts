export interface SessionUser {
  sub: string;
  handle: string;
  displayName: string;
  email: string;
  organisationId: string;
  organisationName: string;
  role: string;
  mfaAt: string | null;
  permissions: string[];
}

export interface TokenSet {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
}

export interface OidcDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint: string;
  jwks_uri: string;
}
