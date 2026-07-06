import {
    Request,
    Response
  } from "express";
import { ReceiptProcessor } from "./ReceiptProcessor";

require('isomorphic-fetch');

  // Microsoft Graph sends an opaque, URL-safe validationToken when a subscription is
  // created and expects it echoed back verbatim as text/plain. The value is attacker
  // influenceable, so strip anything outside the token's known-safe character set
  // before reflecting it. This is a no-op for legitimate tokens (base64url/base64)
  // while removing the characters needed for reflected cross-site scripting.
  const sanitizeValidationToken = (value: unknown): string =>
    String(value).replace(/[^A-Za-z0-9._~+/=\- ]/g, '');

  export const onReceiptAdded = async (req: Request, res: Response) => {
    const validationToken = req.query['validationToken'];
    if (validationToken) {
      const safeValidationToken = sanitizeValidationToken(validationToken);
      res
        .status(200)
        .type('text/plain')
        .set('X-Content-Type-Options', 'nosniff')
        .send(safeValidationToken);
        return;
    }

    const driveId = req.query['driveId'];
    if (!driveId) {
      res.status(200).type('text/plain').send("Notification received without driveId, ignoring");
        return;
    }

    void ReceiptProcessor.processDrive(String(driveId));
    res.status(200).send("");
    return;
  }
