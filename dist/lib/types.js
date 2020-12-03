"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalEvents = exports.PublicEvents = void 0;
var PublicEvents;
(function (PublicEvents) {
    PublicEvents["BeforeTokenSigning"] = "beforeTokenSigning";
    PublicEvents["BeforeResponse"] = "beforeResponse";
    PublicEvents["BeforeUserinfo"] = "beforeUserinfo";
    PublicEvents["BeforeRevoke"] = "beforeRevoke";
    PublicEvents["BeforeAuthorizeRedirect"] = "beforeAuthorizeRedirect";
})(PublicEvents = exports.PublicEvents || (exports.PublicEvents = {}));
var InternalEvents;
(function (InternalEvents) {
    InternalEvents["BeforeSigning"] = "beforeSigning";
})(InternalEvents = exports.InternalEvents || (exports.InternalEvents = {}));
