const express = require("express");
const crypto = require("crypto");
const Document = require("../models/Document");
const User = require("../models/User");
const authenticateToken = require("../middleware/authenticateToken");
const router = express.Router();

router.post("/documents", authenticateToken, async (req, res) => {
  const { title, content, signDocument } = req.body;

  let signature = null;
  if (signDocument) {
    const user = await User.findById(req.user.id);
    const sign = crypto.createSign("SHA256");
    sign.update(content);
    sign.end();
    signature = sign.sign(user.privateKey, "hex");
  }

  const newDocument = new Document({
    title,
    content,
    signedBy: signDocument ? req.user.id : null,
    signature,
    createdBy: req.user.id,
  });

  try {
    const savedDocument = await newDocument.save();
    res.status(201).json({
      message: "Documento criado com sucesso",
      document: savedDocument,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar documento" });
  }
});

router.post("/documents/:id/sign", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }

    if (document.createdBy.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Você não tem permissão para assinar este documento" });
    }

    if (document.signature) {
      return res.status(400).json({ error: "Este documento já foi assinado" });
    }

    const user = await User.findById(req.user.id);
    const sign = crypto.createSign("SHA256");
    sign.update(document.content);
    sign.end();

    const signature = sign.sign(user.privateKey, "hex");

    document.signedBy = req.user.id;
    document.signature = signature;

    await document.save();

    res
      .status(200)
      .json({ message: "Documento assinado com sucesso", document });
  } catch (error) {
    res.status(500).json({ error: "Erro ao assinar documento" });
  }
});

router.get("/documents", authenticateToken, async (req, res) => {
  try {
    const documents = await Document.find().populate([
      { path: "createdBy", select: "username email publicKey" },
      { path: "signedBy", select: "username email publicKey" },
    ]);
    res.status(200).json(documents);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar documentos" });
  }
});

router.get("/documents/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const document = await Document.findById(id).populate([
      { path: "createdBy", select: "username email publicKey" },
      { path: "signedBy", select: "username email publicKey" },
    ]);
    if (!document) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }
    res.status(200).json(document);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar documento" });
  }
});

router.post("/documents/validate", authenticateToken, async (req, res) => {
  const { documentId, signature } = req.body;

  try {
    const document = await Document.findById(documentId).populate("signedBy");
    if (!document || !document.signedBy) {
      return res
        .status(400)
        .json({ error: "Documento não assinado ou inexistente" });
    }

    const verify = crypto.createVerify("SHA256");
    verify.update(document.content);
    verify.end();

    const isValid = verify.verify(
      document.signedBy.publicKey,
      signature,
      "hex"
    );

    res.status(200).json({ valid: isValid });
  } catch (error) {
    res.status(500).json({ error: "Erro ao validar assinatura" });
  }
});

router.get("/documents/my-documents", authenticateToken, async (req, res) => {
  try {
    const documents = await Document.find().populate([
      { path: "createdBy", select: "username email publicKey" },
      { path: "signedBy", select: "username email publicKey" },
    ]);
    res.status(200).json(documents);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar documentos do usuário" });
  }
});


module.exports = router;
