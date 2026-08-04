/*
 * Shared ReSpec configuration for ATP Community Group specifications.
 *
 * Each spec sets `window.specConfig` (shortName, title, subtitle) in its
 * <head>, then loads this file. We translate that into a full `respecConfig`
 * for a W3C Community Group draft. Per-spec local references live in biblio.js.
 */
(function () {
  "use strict";

  var spec = window.specConfig || {};

  // eslint-disable-next-line no-undef
  window.respecConfig = {
    // The ATP Community Group is registered with W3C (group 177419,
    // shortname "atp"), so these render as Draft Community Group Reports.
    specStatus: "CG-DRAFT",
    group: "atp",
    shortName: spec.shortName || "atp-spec",
    editors: [
      {
        name: "Larry Lewis",
        // Matches the W3C CG participant record: individual CLA commitment,
        // affiliated with (but not committing on behalf of) Sovr Inc.
        company: "Individual CLA commitment (affiliated with Sovr Inc., dba SovrLabs)",
        companyURL: "https://sovrlabs.com",
      },
    ],
    github: {
      repoURL: "https://github.com/w3c-cg/atp",
      branch: "main",
    },
    // Local bibliography entries (FIPS 204, RFC 9964, did:wba, etc.).
    localBiblio: window.atpBiblio || {},
    subtitle: spec.subtitle || "",
    xref: ["DID-CORE", "VC-DATA-MODEL", "INFRA"],
    // CG Reports must use the W3C Software and Document License; ReSpec rejects
    // "cc-by" for W3C specifications. Repo-level licensing (spec contributions
    // under the W3C Community CLA) lives in LICENSE.md.
    license: "w3c-software-doc",
  };
})();
