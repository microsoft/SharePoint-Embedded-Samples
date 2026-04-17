import {
    Request,
    Response
  } from "restify";
import { ReceiptProcessor } from "./ReceiptProcessor";

require('isomorphic-fetch');

  export const onReceiptAdded = async (req: Request, res: Response) => {
    
    const validationToken = req.query['validationToken'];
    if (validationToken) {
        res.send(200, validationToken, {"Content-Type":"text/plain"});
        return;
    }

    const driveId = req.query['driveId'];
    if (!driveId) {
        res.send(200, "Notification received without driveId, ignoring", {"Content-Type":"text/plain"});
        return;
    }

    ReceiptProcessor.processDrive(driveId)
    res.send(200, "");
    return;
  }
