export class TokenResponse {
  tokenType: 'Bearer'
  accessToken: string
  /** Access token lifetime in seconds. */
  expiresIn: number
  refreshToken: string
}
