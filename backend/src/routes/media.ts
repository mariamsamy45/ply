import { Router } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

// Production media is stored in Supabase Storage so images/videos survive
// Render restarts and are available to the Vercel frontend.
// Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET
// on the backend. Keep the service-role key server-side only.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

function storageConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "ply-media";

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Media storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return { supabaseUrl, serviceKey, bucket };
}

router.post("/", requireAuth, upload.single("file"), async (req: AuthedRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded." });
    }

    const { supabaseUrl, serviceKey, bucket } = storageConfig();
    const extension = path.extname(req.file.originalname) || "";
    const safeExtension = extension.replace(/[^a-zA-Z0-9.]/g, "");
    const objectPath = `${req.userId}/${crypto.randomUUID()}${safeExtension}`;

    const uploadUrl = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": req.file.mimetype || "application/octet-stream",
        "x-upsert": "false",
      },
      body: req.file.buffer,
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("Supabase Storage upload failed:", response.status, details);
      return res.status(502).json({ error: "Upload failed. Please try again." });
    }

    const publicUrl =
      `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath}`;

    res.status(201).json({ url: publicUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
