export interface PaymentAttachment {
  id: string;
  provider: "telegram";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  providerMetadata: {
    messageId: number;
    fileId: string;
    fileUniqueId: string;
    threadId: number;
  };
  uploadStatus: "uploaded" | "failed";
  error?: string;
}
