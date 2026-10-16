const REQUIRED_FIELDS = ["apiKey", "authDomain", "projectId", "appId"];
const PLATFORM_PROJECT_ID = "guiasys-licensing";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", ""]);

export const platformFirebaseConfig = Object.freeze({
  apiKey: "AIzaSyBXcnv1YsLCXTCtPy0FNs_vvZ_BJMK5o00",
  authDomain: "guiasys-licensing.firebaseapp.com",
  projectId: PLATFORM_PROJECT_ID,
  storageBucket: "guiasys-licensing.firebasestorage.app",
  messagingSenderId: "854287499951",
  appId: "1:854287499951:web:11ab2001b5418b959c0a5a",
  measurementId: "G-FL2Q11LBCD"
});

export const validateFirebaseConfig = (config) => {
  if (!config || typeof config !== "object") throw new Error("firebase_config_missing");
  for (const field of REQUIRED_FIELDS) {
    if (typeof config[field] !== "string" || !config[field].trim()) {
      throw new Error(`firebase_config_invalid_${field}`);
    }
  }
  return config;
};

export const resolveFirebaseConfig = async ({
  hostname = globalThis.location?.hostname || "",
  protocol = globalThis.location?.protocol || "",
  fetchConfig = globalThis.fetch
} = {}) => {
  const canReadHostingConfig = /^https?:$/.test(protocol) && typeof fetchConfig === "function";

  if (canReadHostingConfig) {
    try {
      const response = await fetchConfig("/__/firebase/init.json", {
        cache: "no-store",
        credentials: "same-origin"
      });
      if (!response.ok) throw new Error(`firebase_hosting_config_http_${response.status}`);
      const hostedConfig = validateFirebaseConfig(await response.json());
      if (hostedConfig.projectId !== PLATFORM_PROJECT_ID) {
        throw new Error(`firebase_project_mismatch_${PLATFORM_PROJECT_ID}`);
      }
      return hostedConfig;
    } catch (error) {
      if (!LOCAL_HOSTS.has(hostname)) throw error;
    }
  }

  return platformFirebaseConfig;
};

export const firebaseConfig = await resolveFirebaseConfig();
