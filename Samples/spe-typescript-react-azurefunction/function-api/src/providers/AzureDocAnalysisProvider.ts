
import { DocumentAnalysisClient, AzureKeyCredential, AnalyzeResult, AnalyzedDocument } from '@azure/ai-form-recognizer';
import { Readable } from 'stream';

export interface IReceiptFields {
    Merchant: string | null;
    MerchantAddress: string | null;
    MerchantPhoneNumber: string | null;
    Total: string | null;
};

export class AzureDocAnalysisProvider {

    public static readonly SUPPORTED_FILE_EXTENSIONS = [
        "jpeg",
        "jpg",
        "png",
        "bmp",
        "tiff",
        "pdf"
    ];
    private readonly _azureClient: DocumentAnalysisClient;
    public constructor() {
        this._azureClient = new DocumentAnalysisClient(
            process.env.AZURE_AI_ENDPOINT!,
            new AzureKeyCredential(process.env.AZURE_AI_API_KEY!)
        );
    }

    public async extractReceiptFields(stream: Readable, model: string = 'prebuilt-receipt'): Promise<IReceiptFields | undefined> {
        try {
            const poller = await this._azureClient.beginAnalyzeDocument(model, stream);
            const result: AnalyzeResult<AnalyzedDocument> = await poller.pollUntilDone();
            const fields: IReceiptFields = {
                Merchant: null,
                MerchantAddress: null,
                MerchantPhoneNumber: null,
                Total: null
            };
            if (!result || !result.documents || result.documents.length === 0) {
                return fields;
            }

            const extracted = result.documents[0].fields;
            if (!extracted) {
                return fields;
            }

            fields.Merchant = extracted.MerchantName?.content || null;
            fields.MerchantAddress = extracted.MerchantAddress?.content || null;
            fields.MerchantPhoneNumber = extracted.MerchantPhoneNumber?.content || null;
            fields.Total = extracted.Total?.content || null;
            return fields;
        } catch (error) {
            console.error(`Error extracting receipt fields: ${error}`);
            return undefined;
        }
    }
}

