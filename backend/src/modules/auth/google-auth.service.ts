import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OAuth2Client } from 'google-auth-library'

export interface GoogleProfile {
  sub: string
  email: string
  emailVerified: boolean
  firstName: string
  lastName: string
}

export interface GoogleCodeExchangeResult {
  profile: GoogleProfile
  idToken: string
}

@Injectable()
export class GoogleAuthService {
  private readonly webClient: OAuth2Client
  private readonly webClientId: string | undefined
  private readonly mobileClient: OAuth2Client | null
  private readonly mobileClientId: string | undefined

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.webClientId = configService.get<string>('oauth.googleClientId') || undefined
    this.webClient = new OAuth2Client({
      clientId: this.webClientId,
      clientSecret: configService.get<string>('oauth.googleClientSecret') || undefined,
    })

    // The mobile app uses its own Android OAuth client. Android clients have no
    // client secret; PKCE protects the code exchange instead.
    this.mobileClientId = configService.get<string>('oauth.googleMobileClientId') || undefined
    this.mobileClient = this.mobileClientId
      ? new OAuth2Client({ clientId: this.mobileClientId })
      : null
  }

  /**
   * Picks the OAuth client that issued the auth code / ID token.
   * The web app omits clientId; the mobile app sends its Android client ID.
   */
  private clientFor(clientId?: string): { client: OAuth2Client; audience: string | undefined } {
    if (clientId && this.mobileClientId && clientId === this.mobileClientId && this.mobileClient) {
      return { client: this.mobileClient, audience: this.mobileClientId }
    }
    if (clientId && clientId !== this.webClientId) {
      throw new UnauthorizedException('Unrecognized Google OAuth client')
    }
    return { client: this.webClient, audience: this.webClientId }
  }

  /** Exchanges an authorization code (SPA redirect flow) for a verified Google profile. */
  async exchangeCode(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
    clientId?: string,
  ): Promise<GoogleCodeExchangeResult> {
    const { client } = this.clientFor(clientId)
    let idToken: string | null | undefined
    try {
      const { tokens } = await client.getToken({
        code,
        redirect_uri: redirectUri,
        ...(codeVerifier ? { codeVerifier } : {}),
      })
      idToken = tokens.id_token
    } catch {
      throw new UnauthorizedException('Could not verify Google sign-in. Please try again.')
    }

    if (!idToken) {
      throw new UnauthorizedException('Google sign-in did not return a valid token')
    }

    const profile = await this.verifyIdToken(idToken, clientId)
    return { profile, idToken }
  }

  async verifyIdToken(idToken: string, clientId?: string): Promise<GoogleProfile> {
    const { client, audience } = this.clientFor(clientId)
    try {
      const ticket = await client.verifyIdToken({ idToken, audience })
      const payload = ticket.getPayload()
      if (!payload?.email) {
        throw new UnauthorizedException('Google account has no email address')
      }

      const { firstName, lastName } = this.splitName(payload.given_name, payload.family_name, payload.name)

      return {
        sub: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified === true,
        firstName,
        lastName,
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error
      throw new UnauthorizedException('Could not verify Google sign-in. Please try again.')
    }
  }

  /**
   * Google doesn't always populate given_name/family_name separately — some accounts
   * (e.g. no explicit last name set) put the whole display name in given_name and
   * leave family_name empty. Fall back to splitting the full name on whitespace.
   */
  private splitName(
    givenName: string | undefined,
    familyName: string | undefined,
    fullName: string | undefined,
  ): { firstName: string; lastName: string } {
    const trimmedGiven = givenName?.trim() ?? ''
    const trimmedFamily = familyName?.trim() ?? ''

    if (trimmedGiven && trimmedFamily) {
      return { firstName: trimmedGiven, lastName: trimmedFamily }
    }

    const source = (fullName?.trim() || trimmedGiven).split(/\s+/).filter(Boolean)
    if (source.length === 0) {
      return { firstName: '', lastName: '' }
    }

    return {
      firstName: source[0],
      lastName: source.slice(1).join(' '),
    }
  }
}