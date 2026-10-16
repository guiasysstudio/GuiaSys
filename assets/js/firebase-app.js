import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js";
import { firebaseConfig } from "./firebase-config.js?v=20261015-1";

export const app = initializeApp(firebaseConfig);

const PLATFORM_PROJECT_ID = "guiasys-licensing";
const STUDIO_APP_CHECK_SITE_KEY = "6Ld9SfEtAAAAAEiiUexQP353jHApWxTpzBtNvRn0";

export const appCheck = firebaseConfig.projectId === PLATFORM_PROJECT_ID
  ? initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(STUDIO_APP_CHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    })
  : null;
