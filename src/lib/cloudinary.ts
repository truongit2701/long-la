import crypto from "node:crypto";

type CloudinaryConfig = {
  apiKey: string;
  apiSecret: string;
  cloudName: string;
};

function parseCloudinaryUrl(): CloudinaryConfig | null {
  const value = process.env.CLOUDINARY_URL;

  if (!value) {
    return null;
  }

  const url = new URL(value);

  if (url.protocol !== "cloudinary:") {
    throw new Error("CLOUDINARY_URL must use the cloudinary:// protocol");
  }

  return {
    apiKey: decodeURIComponent(url.username),
    apiSecret: decodeURIComponent(url.password),
    cloudName: url.hostname,
  };
}

function signUpload(params: Record<string, string | number>, apiSecret: string) {
  const payload = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto.createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

export async function uploadQrToCloudinary(qrImageData: string) {
  if (!qrImageData || !qrImageData.startsWith("data:image/")) {
    return qrImageData;
  }

  const config = parseCloudinaryUrl();

  if (!config) {
    return qrImageData;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "long-la/qr";
  const paramsToSign = {
    folder,
    timestamp,
  };
  const signature = signUpload(paramsToSign, config.apiSecret);
  const formData = new FormData();

  formData.append("file", qrImageData);
  formData.append("api_key", config.apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Không upload được QR lên Cloudinary");
  }

  return String(data.secure_url ?? data.url ?? qrImageData);
}
