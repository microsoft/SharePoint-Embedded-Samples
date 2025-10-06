/**
 * Base interface for messages between the embed page and its host.
 */
export declare interface IEmbedBaseMessage {
  /**
   * Id for the 'conversation' to which this message belongs.
   * The embed host should respond to a given message and
   * supply the same value in its body.
   */
  conversationId: number;
}

// eslint-disable-next-line @typescript-eslint/typedef
export const EmbedMessageType = {
  error: 'error',
  success: 'success',
  getToken: 'getToken',
  result: 'result'
} as const;
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EmbedMessageType = (typeof EmbedMessageType)[keyof typeof EmbedMessageType];

/**
 * Message sent from the embed page to the host when content has been successfully rendered.
 */
export declare interface IEmbedSuccessMessage extends IEmbedBaseMessage {
  type: typeof EmbedMessageType.success;
}

/**
 * Message sent from embed page for new token
 */
export interface IEmbedFetchNewTokenMessage extends IEmbedBaseMessage {
  type: typeof EmbedMessageType.getToken;
}

export declare interface IEmbedError {
  code?: string;
  message?: string;
}

export declare interface IEmbedErrorMessage extends IEmbedBaseMessage {
  type: typeof EmbedMessageType.error;
  isExpected: boolean;
  error?: IEmbedError;
}

export type IEmbedMessage = IEmbedSuccessMessage | IEmbedErrorMessage | IEmbedFetchNewTokenMessage;

export declare interface IEmbedSuccessResult {
  result: typeof EmbedMessageType.success;
  token?: string;
}

export declare interface IEmbedErrorResult {
  result: typeof EmbedMessageType.error;
  isExpected: boolean;
  error?: IEmbedError;
}

/**
 * Message sent to embed page for result
 */
export declare interface IEmbedResultMessage extends IEmbedBaseMessage {
  type: typeof EmbedMessageType.result;
  data: IEmbedSuccessResult | IEmbedErrorResult;
}

// eslint-disable-next-line @typescript-eslint/typedef
export const TokenType = {
  MS_LOKI: 'MS_LOKI_TOKEN',
  SHAREPOINT: 'SHAREPOINT_TOKEN',
  MS_GRAPH: 'MS_GRAPH_TOKEN',
  OFFICE_OCPS: 'MS_OFFICE_OCPS',
  AZ_RMS: 'AZ_RMS_TOKEN'
} as const;
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type TokenType = (typeof TokenType)[keyof typeof TokenType];

export interface ITokenCommand {
  command: typeof EmbedMessageType.getToken;
  tokenType: TokenType;
}

export interface IMockData {
  embedPageOrigin?: string;
  embedUrl?: string;
  channelId?: string;
  clientId?: string;
  hostOrigin?: string;
  accessToken?: string;
  mipToken?: string;
  hostTheme?: string;
  tokenExpires?: string;

  downloadUrl?: string;
}

export interface IMockData {
  [key: string]: string | undefined;
}
