import { AzureKeyCredential, DocumentAnalysisClient } from "@azure/ai-form-recognizer";
import { GraphProvider } from "./GraphProvider";
import { Readable } from 'stream';
import axios, { AxiosRequestConfig } from 'axios';


export abstract class ReceiptProcessor {

    public static async processDrive(driveId: string): Promise<void> {
        if (!this.hasDocumentAnalysisConfig()) {
            console.log('Skipping receipt processing because DAC_RESOURCE_ENDPOINT or DAC_RESOURCE_KEY is not configured.');
            return;
        }

        const changedItems = await GraphProvider.getDriveChanges(driveId);
        for (const changedItem of changedItems) {
            if (changedItem.deleted && changedItem.deleted.state === "deleted") {
                continue
            }
            try {
                const item = await GraphProvider.getDriveItem(driveId, changedItem.id);
                const extension = this.getFileExtension(item.name);
                if (this.SUPPORTED_FILE_EXTENSIONS.includes(extension.toLowerCase())) {
                    console.log(item.name);
                    const url = item["@microsoft.graph.downloadUrl"];
                    const receipt = await this.analyzeReceiptStream(await this.getDriveItemStream(url));
                    const receiptString = JSON.stringify(receipt, null, 2)
                    const fileName = this.getFileDisplayName(item.name) + "-extracted-fields.json";
                    const parentId = item.parentReference.id;
                    await GraphProvider.addDriveItem(driveId, parentId, fileName, receiptString);
                }
            } catch (error) {
                console.log(error);
            }
        }
    }
    private static getFileDisplayName(name: string): string | any {
        return name.split('.')[0];
    }

    private static readonly SUPPORTED_FILE_EXTENSIONS = ['jpeg', 'jpg', 'png', 'bmp', 'tiff', 'pdf'];

    private static hasDocumentAnalysisConfig(): boolean {
        return Boolean(process.env["DAC_RESOURCE_ENDPOINT"] && process.env["DAC_RESOURCE_KEY"]);
    }

    private static getDocumentAnalysisClient(): DocumentAnalysisClient {
        const endpoint = process.env["DAC_RESOURCE_ENDPOINT"];
        const key = process.env["DAC_RESOURCE_KEY"];

        if (!endpoint || !key) {
            throw new Error('DAC_RESOURCE_ENDPOINT and DAC_RESOURCE_KEY must be configured to process receipts.');
        }

        return new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
    }

    private static async getDriveItemStream(url: string): Promise<Readable> {
        const token = GraphProvider.graphAccessToken;
        const config: AxiosRequestConfig = {
            method: "get",
            url: url,
            headers: {
                "Authorization": `Bearer ${token}`
            },
            responseType: 'stream'
        };
        const response = await axios.get<Readable>(url, config);
        return response.data;
    }

    private static getFileExtension(name: string): string | any {
        return name.split('.').pop();
    }

    private static async analyzeReceiptStream(stream: Readable): Promise<any> {
        const client = this.getDocumentAnalysisClient();

        const poller = await client.beginAnalyzeDocument("prebuilt-invoice", stream, {
            onProgress: ({ status }) => {
                console.log(`status: ${status}`);
            },
        });

        const {
            documents: [result] = [],
        } = await poller.pollUntilDone();

        const fields = result?.fields;
        this.removeUnwantedFields(fields);
        return fields;
    }

    private static removeUnwantedFields(fields: any) {
        for (const prop in fields) {
            if (prop === 'boundingRegions' || prop === 'content' || prop === 'spans') {
                delete fields[prop];
            }
            if (typeof fields[prop] === 'object') {
                this.removeUnwantedFields(fields[prop]);
            }
        }
    }
}