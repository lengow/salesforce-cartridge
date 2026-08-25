# link_lengow

## LINK Cartridge Developer Guide

* **Description:** Lengow is a central platform at the heart of your e-commerce strategy. Select and import your product data from SFCC to Lengow and optimize it for hundreds of different marketing channels.
* **Version:** 22.1.0 <!-- x-release-please-version -->
* **Compatibility:**
  * **Independent of SFRA.** The cartridge has no SFRA runtime dependency — no `module.superModule`, no `require('server')`, no reference to `app_storefront_base`. It works the same on SFRA 5, 6, 7 and 8, and an SFRA major upgrade cannot break it. `bm_lengow` runs inside the Business Manager, `int_lengow` executes server-side jobs.
  * **Compatibility modes 15.5 through 22.7 are supported.** 22.7 — the most recent mode Salesforce offers — was verified end to end on 25 August 2026. Earlier modes rest on a per-mode analysis of every behavioural change Salesforce documents, checked against the APIs this cartridge actually calls, together with field evidence from live installations.
  * **Below 15.5 is not supported.** That is the mode where Salesforce established the `require()` / `module.exports` model this cartridge is built on; earlier modes do not have those semantics.
  * Lab-testing each older mode is not possible: the compatibility mode is instance-wide and only moves forward, so an instance already on 22.7 cannot be moved back down.

----

## Getting Started

1. Clone this repository.
2. Run `npm install` to install all of the local dependencies.
3. Run `npm run build` to compile all client-side JS and CSS files.
4. Create a `dw.json` file in the root of the project:
```json
{
    "hostname": "your-sandbox-hostname.demandware.net",
    "username": "yourlogin",
    "password": "yourpwd",
    "code-version": "version_to_upload_to"
}
```
5. Upload the Lengow cartridges to the sandbox you specified in `dw.json` file.
6. Follow the full installation guide below.

> **Node 18**: if you get the error `error:0308010C:digital envelope routines::unsupported`, run:
> ```bash
> export NODE_OPTIONS=--openssl-legacy-provider
> npm run build
> ```

----

## Before you start

### You must provide an SFTP server

**B2C Commerce does not host one.** A B2C Commerce instance exposes WebDAV over HTTPS and nothing else — there is no SSH and no SFTP on the platform. The cartridge is an SFTP *client*: it pushes the generated files out to a server you supply.

That server is the drop box in the middle of the flow:

```
SFCC (LengowUploadFeed)  ──push──▶  your SFTP  ◀──pull──  Lengow platform
        Step 4                                              Step 7
```

The same host, user and password go in both places. Plain FTP is not supported — SFTP only.

### Compatibility

| | |
|---|---|
| **Compatibility modes** | **15.5 → 22.7 supported.** 22.7 verified end to end |
| Platform release | any — every `dw.*` API used here is old and stable |
| SFRA | irrelevant; no SFRA runtime dependency (tested alongside SFRA 8.0.0) |
| Node (build only) | 20, with `NODE_OPTIONS=--openssl-legacy-provider` |

The server code is strict ES5. Support for modes below 22.7 rests on a per-mode analysis — every behavioural change Salesforce documents for each mode, checked against the APIs this cartridge calls — plus field evidence from live installations.

**Below 15.5 is not supported**: 15.5 is where Salesforce established the `require()` / `module.exports` model this cartridge is built on.

Lab-testing each older mode is not possible — the mode is instance-wide and only moves forward, so an instance already on 22.7 cannot be moved back down.

### The whole install in one glance

| Step | Where | Skipping it gives you |
|---|---|---|
| 1. Upload cartridges | WebDAV | nothing works |
| 2. Import metadata | BM | the config page errors |
| 3. Cartridge paths | BM | no Lengow menu |
| **3b. Grant the module to your role** | BM | **no Lengow menu, even with step 3 done** |
| **3c. Re-activate the code version** | BM | **"the job is invalid", unknown step type** |
| 4. SFTP service | BM | uploads fail |
| 5. Export job | BM | nothing is generated |
| 6. Attributes and locales | BM | empty or incomplete CSVs |
| 7. Lengow catalog | Lengow | files are produced but never collected |

Steps **3b** and **3c** are the two that most often stall an installation, and neither is discoverable from the error messages.

----

## Installation

### Step 1 — Upload cartridges

Upload both cartridge folders to your active code version:

```
cartridges/bm_lengow   → /{code-version}/bm_lengow/
cartridges/int_lengow   → /{code-version}/int_lengow/
```

```bash
npx dwupload --cartridges cartridges/bm_lengow cartridges/int_lengow
```

### Step 2 — Import metadata

Metadata files are located in `metadata/site-template/`:

| File | Contents |
|---|---|
| `meta/system-objecttype-extensions.xml` | Site preferences (Lengow attributes, selected locales) |
| `services.xml` | SFTP and HTTP service definitions for export |
| `jobs.xml` | LengowFeed job definition (optional, can be created manually) |

1. Zip the `metadata/site-template/` folder into a `.zip` file
2. In BM: **Administration > Site Development > Site Import & Export**
3. Upload the zip file via **Import > Upload**
4. Select the file and click **Import**

> If you don't want to use `jobs.xml` (which references the `RefArch` site), only import `system-objecttype-extensions.xml` and `services.xml`, then create the job manually (see Step 4).

### Step 3 — Configure cartridge paths

#### Business Manager Site

**Administration > Sites > Manage Sites > Business Manager > Settings**

Add to the **Cartridges** field:

```
bm_lengow:int_lengow:[existing cartridges]
```

> `bm_lengow` is required for the Lengow menu. `int_lengow` is required so the BM can resolve `*/cartridge/...` modules.

#### Storefront Site(s)

**Administration > Sites > Manage Sites > [your site] > Settings**

Add to the **Cartridges** field:

```
int_lengow:[existing cartridges]
```

> Repeat for **every site** that needs to export a catalog to Lengow.

> `bm_lengow` requires `int_lengow` to be in the **Business Manager** cartridge path as well — the controller resolves the shared `*/cartridge/scripts/helpers/collections` module from it.

### Step 3b — Grant the Lengow module to your Business Manager role

**The menu will NOT appear after Step 3 alone.** Adding the cartridge only makes the module *available*; a role still has to be granted access to it.

1. **Administration > Organization > Roles & Permissions**
2. Click your role (typically `Administrator`)
3. Open the **Business Manager Modules** tab
4. Click **Select Context**, tick the site(s) that will export to Lengow, click **Apply**
5. Tick the **Write** checkbox on both **Lengow** and **Export Attributes Configurations**
6. Click **Update** at the bottom of the page

The **Lengow** menu now appears under **Merchant Tools** when the matching site is selected.

### Step 3c — Re-activate your code version

If you uploaded the cartridges into a code version that was **already active**, the custom job step types are not registered yet. The job you import in Step 5 will show *"The job is invalid"* with:

```
Invalid step [Lengow Generate Feed]! Type with id [custom.LengowCatalogFeed] is unknown!
```

`steptypes.json` is scanned only when a code version is activated. Fix:

**Administration > Site Development > Code Deployment** — activate any other code version, then activate yours again.

> Deploying into a *new* code version and activating it once avoids this entirely.

### Step 4 — Configure the SFTP service

If you imported `services.xml`, the services are already created. You only need to update the SFTP credentials.

**Administration > Operations > Services > Credentials tab**

Edit `lengow.sftp.credentials`:

| Field | Value | Notes |
|---|---|---|
| URL | `sftp://your-sftp-host` | the `sftp://` scheme is required; add `:port` if it is not 22 |
| User | your SFTP username | |
| Password | your SFTP password | write-only in the UI — you can set it but not read it back |

Verify that the `lengow.sftp` service (Services tab) is enabled with type SFTP.

> Note the password field cannot be read back once saved. Keep the credentials wherever they were issued — you will need the same ones again in Step 7.

<details>
<summary>Manual creation (if services.xml was not imported)</summary>

1. **Profiles tab** > New > ID: `lengow.sftp.profile` > Timeout: 30000ms > Apply
2. **Credentials tab** > New > ID: `lengow.sftp.credentials` > fill in URL/User/Password > Apply
3. **Services tab** > New:
   - ID: `lengow.sftp`
   - Type: SFTP
   - Enabled: check
   - Profile: `lengow.sftp.profile`
   - Credentials: `lengow.sftp.credentials`
   - Apply
</details>

### Step 5 — Configure the export job

If you imported `jobs.xml`, the `LengowFeed` job already exists. Otherwise, create it manually.

**Administration > Operations > Jobs > New Job** — Job ID: `LengowFeed`

In the **Job Steps** tab, configure two steps in order:

#### Step 1: `custom.LengowCatalogFeed`

| Parameter | Default | Description |
|---|---|---|
| ImpexFolderName | `src/lengow` | IMPEX folder where the CSV is generated |
| FileNamePrefix | `lengow` | File name prefix |
| IncludeTimeStamp | `false` | **Leave this at `false`** — see below |
| CatalogID | _(empty)_ | Catalog ID to export. If empty, exports all site products |
| SkipMaster | `true` | Exclude master products |
| AvailableOnly | `false` | Export only in-stock products |
| OnlineOnly | `false` | Export only online products |
| IsDisabled | `false` | Disable this step |

**Scope**: select the relevant site(s).

One CSV file is generated **per selected locale** (see Step 6), named:

```
<FileNamePrefix>_<siteID>_<localeID>.csv        e.g.  lengow_RefArchGlobal_fr_FR.csv
```

> ⚠️ **`IncludeTimeStamp` must stay `false`.** Setting it to `true` inserts a timestamp into the file name — `lengow_RefArchGlobal_20260825_143012_7_fr_FR.csv` — which therefore **changes on every run**. Lengow imports a fixed file name, so it would stop finding the file after the first execution.

#### Step 2: `custom.LengowUploadFeed`

> **Note**: the step type is called `LengowUploadFeed` (not "UpdateFeed").

| Parameter | Default | Description |
|---|---|---|
| ServiceID | `lengow.sftp` | SFTP service ID configured in Step 4 |
| SftpFolderName | _(required)_ | Destination folder on the SFTP server, e.g. `/lengow` |
| ImpexFolderName | `src/lengow` | IMPEX source folder (must match step 1) |
| IsDisabled | `false` | Disable this step |

**Scope**: select **Organization** (not a specific site). This is correct and verified — the step runs fine in organization context.

What this step does, in order: connect, `cd` into `SftpFolderName` (creating it if absent), transfer each CSV, ZIP the transferred files into `<ImpexFolderName>/archive/`, then delete them from IMPEX. If **any** transfer fails, the step ends in `ERROR` and the files stay in IMPEX for the next run.

In the **Schedule and History** tab, set a recurrence (recommended: every 6 to 12 hours). You can test manually with **Run Now**.

### Step 6 — Configure attributes and locales

1. Select your site in the site selector (top left)
2. Go to **Merchant Tools > Lengow > Export Attributes Configurations**
3. In **Mandatory Attributes Configuration**, check the required attributes and click **Save**
4. In **Additional Attributes Configuration**, check the additional attributes and click **Save**
5. In the **Select Locale** dropdown, check the locales to export

> Each selected locale generates a separate CSV file when the job runs.

### Step 7 — Configure the catalog in Lengow

1. Log in to your Lengow account
2. Go to **Catalogs > Add a new catalog**
3. Select the import method **Salesforce Commerce Cloud**
4. Enter the connection details of the **same SFTP** you configured in Step 4:

| Field | Value | Notes |
|---|---|---|
| Host | `sftp://your-sftp-host` | ⚠️ **include the `sftp://` scheme** — without it the import fails with `URL schema "" is not allowed` |
| Port | `22` | or your custom port |
| Path | the same folder as `SftpFolderName` | e.g. `/lengow` |
| File name | `lengow_<siteID>_<localeID>.csv` | e.g. `lengow_RefArchGlobal_fr_FR.csv` |
| Username / Password | same as Step 4 | |

> **One Lengow catalog per locale.** The export produces one file per selected locale, and a Lengow catalog imports one file. Four locales means four catalogs, each pointing at its own file name.

5. Schedule the Lengow import to run **after** the SFCC export job, so it always collects fresh data.

> The file name and its location must not change between runs — this is why `IncludeTimeStamp` stays `false` (Step 5).

----

## Verify the installation

Run `LengowFeed` once with **Run Now**, then check these six things in order. Each one tells you which step to go back to.

| # | Check | Where | If it fails |
|---|---|---|---|
| 1 | The **Lengow** menu is visible | Merchant Tools | Steps 3 and 3b |
| 2 | The attribute list loads, the locale dropdown opens and lists your allowed locales | Merchant Tools ▸ Lengow | Step 2 |
| 3 | One CSV per selected locale appears in `IMPEX/src/lengow/` | WebDAV or **Go to IMPEX** | Step 5, step 1 of the job |
| 4 | The files arrive on the SFTP | your SFTP server | Step 4, and `SftpFolderName` in Step 5 |
| 5 | `IMPEX/src/lengow/` is now empty and `archive/` holds one `.zip` per file | WebDAV | the transfer failed — see the log below |
| 6 | The job ends **OK** | Administration ▸ Operations ▸ Jobs | see the log below |

**The custom log is the place to look:** `Logs/custom-LENGOW-*.log` over WebDAV, or Administration ▸ Site Development ▸ Development Setup ▸ Log Files. It names every file that transferred and every file that did not.

A job in `ERROR` with `SFTP upload failed for N of M file(s)` means the generation worked and the transfer did not — check Step 4 and `SftpFolderName`, not the export configuration.

----

## Testing

### Running unit tests

```bash
npm run test       # Run all unit tests
npm run cover      # Run tests with coverage report (output in coverage/)
```

### Linting

```bash
npm run lint       # Lint all JavaScript and SCSS files
```

----

## Troubleshooting

### The Lengow menu does not appear in the BM

In order of likelihood:

1. **The module is not granted to your role** — this is by far the most common cause, and the cartridge path being correct is not enough. See **Step 3b**.
2. `bm_lengow` is not in the **Business Manager** site cartridge path (Step 3)
3. The wrong site is selected in the site selector

### The job is marked "invalid" — `custom.LengowCatalogFeed` is unknown

The step types were not registered because the cartridges landed in an already-active code version. See **Step 3c**.

### The job finishes green but Lengow receives nothing

This was a real bug up to and including v22.1.0: every SFTP transfer could fail and the job still reported `OK`. It is fixed — the step now returns `ERROR` when any file fails to upload.

If you are on an older version, check the custom `LENGOW` log for `Failed Upload CSV Files` even when the job looks successful.

### "Module not found" error when running the job

```
Module "*/cartridge/models/lengow/decorators/index" not found
```

`int_lengow` is not in the cartridge path of the site the job is running for.
**Solution**: add `int_lengow` to the storefront site cartridge path (Step 3).

### The "Manage Export Attributes" page shows an error

- Verify that metadata has been imported (Step 2)
- The site preferences `lengowMandatoryAttributes`, `lengowAdditionalAttributes`, `lengowSeletedLocales` must exist

### The "Select Locale" dropdown does not open / shows (0) Locale Selected

- Verify that the site has **Allowed Locales** configured: **Administration > Sites > Manage Sites > [site] > Allowed Locales**
- Make sure the cartridge version on `main` is up to date (fix PCMT-1347)

### The CSV contains an unexpected currency

The file itself is always consistent — `currencyCode` and `sale_price` always match. What can surprise you is *which* currency a given locale's file ends up with.

When the currency for a locale cannot be applied, the session keeps the **previous locale's** currency, so the file for locale X ships with currency Y, correctly labelled. The cartridge now logs a warning in the custom `LENGOW` log in both cases:

1. **The locale is not in `countries.json`** — the file ships with 50 locales. Add yours:
   ```json
   { "id": "xx_XX", "currencyCode": "XXX" }
   ```
2. **The currency is not allowed on the site** — add it under **Administration > Sites > Manage Sites > [site] > Allowed Currencies**.

### The transfer fails, or the files land in the wrong place on the SFTP

Check `SftpFolderName` (Step 5). It is the folder on the remote server, for example `/lengow`.

> Up to and including v22.1.0 this value had to end with a slash, otherwise the destination path was built without a separator and the file was written to the server root under a mangled name — silently succeeding on permissive servers. This is fixed; a trailing slash is no longer needed and is harmless if present.

### Lengow reports `URL schema "" is not allowed`

The Host field in the Lengow catalog is missing its scheme. Use `sftp://your-host`, not `your-host`. See Step 7.

### Lengow reports it cannot retrieve the file

The connection worked but the file was not found. In order of likelihood:

1. The SFCC job has not run yet, or its upload step failed — check the job status and the custom log
2. The **Path** or **File name** in Lengow does not match what the job produces — compare against `IMPEX/src/lengow/` before the upload, or your SFTP folder after
3. `IncludeTimeStamp` was set to `true`, so the file name changed (Step 5)

### OpenSSL error during build

### OpenSSL error during build

```
error:0308010C:digital envelope routines::unsupported
```

```bash
export NODE_OPTIONS=--openssl-legacy-provider
npm run build
```

----

## Cartridge structure

```
bm_lengow/          Business Manager module (configuration UI)
  controllers/        LengowController.js (attribute + locale management)
  templates/          ISML templates for the BM
  static/             Compiled assets (JS/CSS)
  bm_extensions.xml   BM menu declaration

int_lengow/          Integration module (business logic)
  scripts/jobs/       generateLengowCatalog.js (CSV generation + upload)
  scripts/helpers/    Helpers (price, inventory, URL, images, categories)
  scripts/init/       SFTP service initialization
  models/lengow/      Decorators (CSV generation pipeline)
  config/             productAttr.json, countries.json
  steptypes.json      Job step type definitions
```

----

## Support

Lengow technical support: https://help.lengow.com/hc/en/requests/new
