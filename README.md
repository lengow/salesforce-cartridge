# link_lengow

## LINK Cartridge Developer Guide

* **Description:** Lengow is a central platform at the heart of your e-commerce strategy. Select and import your product data from SFCC to Lengow and optimize it for hundreds of different marketing channels.
* **Version:** 22.1.0
* **Compatibility:** Compatible with SFRA 6.0.0 and 7.0.0, Compatibility Mode 21.7 and 22.7+. This cartridge is standalone and does not depend on SFRA at runtime. `bm_lengow` runs inside the Business Manager, `int_lengow` executes server-side jobs.

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

After saving, the **Lengow** menu should appear under **Merchant Tools** when you select the correct site.

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

- Verify that `bm_lengow` is in the **Business Manager** site cartridge path
- Verify that you have selected the correct site in the site selector

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
