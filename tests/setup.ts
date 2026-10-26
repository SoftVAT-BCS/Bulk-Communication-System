import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
afterEach(cleanup);
// jsdom models dialog state only; real focus trapping/geometry is checked in browser.
if (typeof HTMLDialogElement !== "undefined") {
HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
}
