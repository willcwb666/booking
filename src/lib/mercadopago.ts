import "server-only";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { decrypt } from "./encrypt";

export function getMpClient(encryptedToken: string) {
  const accessToken = decrypt(encryptedToken);
  return new MercadoPagoConfig({ accessToken });
}

export type PixPaymentResult = {
  id: string;
  qrCode: string;
  qrCodeBase64: string;
  status: string;
};

export async function createPixPayment(
  encryptedToken: string,
  params: {
    bookingId: string;
    amount: number;
    description: string;
    payerEmail: string;
    payerName: string;
  }
): Promise<PixPaymentResult> {
  const client = getMpClient(encryptedToken);
  const paymentApi = new Payment(client);

  const result = await paymentApi.create({
    body: {
      transaction_amount: params.amount,
      description: params.description,
      payment_method_id: "pix",
      payer: {
        email: params.payerEmail,
        first_name: params.payerName,
      },
    },
    requestOptions: { idempotencyKey: params.bookingId },
  });

  return {
    id: String(result.id),
    qrCode: result.point_of_interaction?.transaction_data?.qr_code ?? "",
    qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64 ?? "",
    status: result.status ?? "pending",
  };
}

export async function getPixPaymentStatus(
  encryptedToken: string,
  paymentId: string
): Promise<string> {
  const client = getMpClient(encryptedToken);
  const paymentApi = new Payment(client);
  const result = await paymentApi.get({ id: paymentId });
  return result.status ?? "pending";
}
