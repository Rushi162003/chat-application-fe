# Backend: Image Messages (Upload → Cloudinary)

The frontend sends the image file to the backend, the backend uploads it to Cloudinary and returns the URL. Only the URL is stored in MongoDB.

Flow:

1. Frontend `POST /api/upload` (multipart/form-data, field name `image`, JWT in `Authorization` header)
2. Backend uploads the buffer to Cloudinary and responds `{ "imageUrl": "<secure_url>" }`
3. Frontend emits `send-message` with `{ chatId, type: "image", imageUrl }`
4. Backend stores the message with `type` and `imageUrl` and broadcasts it as usual

---

## 1. Install

```bash
npm i cloudinary multer
```

Env vars (from the Cloudinary dashboard):

```
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## 2. Upload route

```js
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Memory storage — Render's disk is ephemeral, never write to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB, matches frontend limit
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

// Use the same JWT auth middleware as your other /api routes
app.post("/api/upload", authMiddleware, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image provided" });

  const stream = cloudinary.uploader.upload_stream(
    { folder: "chat-images", resource_type: "image" },
    (error, result) => {
      if (error) return res.status(500).json({ message: "Upload failed" });
      res.json({ imageUrl: result.secure_url });
    }
  );
  stream.end(req.file.buffer);
});
```

## 3. Message model

Add to the message schema (alongside the existing `location` support):

```js
type: { type: String, enum: ["text", "location", "image"], default: "text" },
imageUrl: { type: String },
```

## 4. `send-message` handler

Accept and persist the new fields:

```js
socket.on("send-message", async ({ chatId, text, type, location, imageUrl }) => {
  // ...existing auth/participant checks...
  const message = await Message.create({
    chatId,
    senderId: userId,
    type: type || "text",
    text: text || "",
    ...(type === "location" && location ? { location } : {}),
    ...(type === "image" && imageUrl ? { imageUrl } : {}),
  });
  // ...existing broadcast logic (receive-message etc.)...
});
```

Recommended: validate that `imageUrl` starts with `https://res.cloudinary.com/<your-cloud-name>/` so clients can't inject arbitrary URLs.
