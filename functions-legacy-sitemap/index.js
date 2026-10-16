"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { LEGACY_PROJECT_COLLECTION, buildSitemap } = require("./sitemap.js");

initializeApp();

exports.sitemap = onRequest(
  { region: "southamerica-east1", cors: false, invoker: "public" },
  async (_request, response) => {
    try {
      const snapshot = await getFirestore()
        .collection(LEGACY_PROJECT_COLLECTION)
        .where("visible", "==", true)
        .get();

      response.set("Content-Type", "application/xml; charset=utf-8");
      response.set("Cache-Control", "public, max-age=900, s-maxage=3600");
      response.status(200).send(buildSitemap(snapshot.docs.map((document) => document.id)));
    } catch (error) {
      console.error("sitemap_failed", error);
      response.status(503).type("text/plain").send("Sitemap temporariamente indisponível.");
    }
  }
);
