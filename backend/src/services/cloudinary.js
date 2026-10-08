import { v2 as cloudinary } from "cloudinary";

export function isCloudinaryConfigured() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  return Boolean(
    CLOUDINARY_CLOUD_NAME &&
      CLOUDINARY_CLOUD_NAME.trim() !== "" &&
      CLOUDINARY_API_KEY &&
      CLOUDINARY_API_KEY.trim() !== "" &&
      CLOUDINARY_API_SECRET &&
      CLOUDINARY_API_SECRET.trim() !== "",
  );
}

function getCloudinaryClient() {
  if (!isCloudinaryConfigured()) {
    const error = new Error(
      "Cloudinary is not configured. Please add the required environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).",
    );
    error.status = 400;
    throw error;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
    api_key: process.env.CLOUDINARY_API_KEY.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
    secure: true,
  });

  return cloudinary;
}

export async function uploadCertificate({
  buffer,
  originalName,
  mime,
  athleteId,
}) {
  const client = getCloudinaryClient();

  const isPdf = mime === "application/pdf";
  const folder = `one-nation-one-athlete/achievements/${athleteId}`;

  return new Promise((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      {
        folder,
        resource_type: isPdf ? "raw" : "auto",
        public_id: `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 50)}`,
        tags: ["athlete-achievement", `athlete-${athleteId}`],
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format || (isPdf ? "pdf" : "jpg"),
          originalName: originalName.slice(0, 200),
        });
      },
    );

    uploadStream.end(buffer);
  });
}

export async function deleteCertificate(publicId, resourceType = "image") {
  if (!isCloudinaryConfigured() || !publicId) return { ok: true };
  try {
    const client = getCloudinaryClient();
    const result = await client.uploader.destroy(publicId, {
      resource_type: resourceType === "pdf" || resourceType === "raw" ? "raw" : "image",
    });
    return result;
  } catch (err) {
    // Graceful handling of Cloudinary failure during deletion
    console.error("Cloudinary delete asset error:", err.message);
    return { ok: false, error: err.message };
  }
}
