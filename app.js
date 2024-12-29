import Alpine from "https://cdn.jsdelivr.net/npm/alpinejs@3.14.3/+esm";
import { initStore } from "./globalStore.js";


document.addEventListener("alpine:init", () => {
    initStore(Alpine);
});


Alpine.start();

