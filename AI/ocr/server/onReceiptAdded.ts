import {
    Request,
    Response
  } from "express";
import { ReceiptProcessor } from "./ReceiptProcessor";

require('isomorphic-fetch');

  export const onReceiptAdded = async (req: Request, res: Response) => {
    const validationToken = req.query['validationToken'];
    if (validationToken) {
      res.status(200).type('text/plain').send(String(validationToken));
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
