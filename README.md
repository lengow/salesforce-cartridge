# link_lengow

## LINK Cartridge Developer Guide

* **Description:** Lengow is a central platform at the heart of your e-commerce strategy. Select and import your product data from SFCC to Lengow and optimize it for hundreds of different marketing channels.
* **Version:** 22.1.0 <!-- x-release-please-version -->
* **Compatibility:**
  * **Independent of SFRA.** The cartridge has no SFRA runtime dependency — no `module.superModule`, no `require('server')`, no reference to `app_storefront_base`. It works the same on SFRA 5, 6, 7 and 8, and an SFRA major upgrade cannot break it. `bm_lengow` runs inside the Business Manager, `int_lengow` executes server-side jobs.
  * **Compatibility mode: verified on 22.7**, the most recent mode Salesforce offers. Full test matrix run on 24 August 2026.
  * The code is ES5 only, so it parses and runs under older modes too. Those have not been re-verified: compatibility mode is instance-wide and can only be changed upward, so a sandbox already on 22.7 cannot be moved back down to test them.

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

| Field | Value |
|---|---|
| URL | `sftp://your-sftp-server-host` |
| User | your SFTP username |
| Password | your SFTP password |

Verify that the `lengow.sftp` service (Services tab) is enabled with type SFTP.

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
| IncludeTimeStamp | `false` | Append a timestamp to the file name |
| CatalogID | _(empty)_ | Catalog ID to export. If empty, exports all site products |
| SkipMaster | `true` | Exclude master products |
| AvailableOnly | `false` | Export only in-stock products |
| OnlineOnly | `false` | Export only online products |
| IsDisabled | `false` | Disable this step |

**Scope**: select the relevant site(s).

> One CSV file is generated **per selected locale** (see Step 6).

#### Step 2: `custom.LengowUploadFeed`

> **Note**: the step type is called `LengowUploadFeed` (not "UpdateFeed").

| Parameter | Default | Description |
|---|---|---|
| ServiceID | `lengow.sftp` | SFTP service ID configured in Step 4 |
| SftpFolderName | _(required)_ | Destination folder on the SFTP server |
| ImpexFolderName | `src/lengow` | IMPEX source folder (must match step 1) |
| IsDisabled | `false` | Disable this step |

**Scope**: select **Organization** (not a specific site).

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
4. Enter your SFTP connection details: Host, Port, Path, File name, Username, Password

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

### The CSV contains incorrect currencies

The locale-to-currency mapping is defined in `int_lengow/cartridge/config/countries.json`. The file ships with 50 pre-configured locales. If your site uses a locale not in the list, add it:

```json
{ "id": "xx_XX", "currencyCode": "XXX" }
```

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
