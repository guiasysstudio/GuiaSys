import { getFunctions } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js";
import { app } from "./firebase-app.js?v=20261014-4";

export const functions = getFunctions(app, "southamerica-east1");
