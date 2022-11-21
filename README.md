# link_lengow
## LINK Cartridge Developer Guide ##

* **Description:**  Lengow is a central platform at the heart of your e-commerce strategy. Select and import your product data from SFCC to Lengow and optimize it for hundreds of different marketing channels.
* **Version:** 22.1.0
* **Compatibility:** <span style="color:red">This version of the Lengow cartridge is compatible with all the three frameworks of SFCC i.e. pipelines version 105.2.0, controllers version 105.2.0 and SFRA version 6.0.0. Cartridge has been tested against code compatibility version 21.7.</span>

----
## Getting Started ##
1. Clone this repository.
2. Navigate to link_lengow folder where package.json is present
3. Run `npm install` to install all of the local dependencies (This Cartridge has been tested with v14.16.1 and is recommended)
4. Run `npm run build ` from the command line that would compile all client-side JS and css files.
5. Create `dw.json` file in the root of the project:
```json
{
    "hostname": "your-sandbox-hostname.demandware.net",
    "username": "yourlogin",
    "password": "yourpwd",
    "code-version": "version_to_upload_to"
}
```
6. Upload the Lengow cartridges to the sandbox you specified in `dw.json` file.
7. Use /metadata/site-template to zip and import cartridge data on your sandbox.
8. Add the 'bm_lengow' and 'int_lengow' cartridge to your BM cartridge path in - Administration >  Sites >  Manage Sites > Business Manager Site > Cartridges.
9. Add the 'int_lengow' cartridge to your site cartridge path in - Administration >  Sites >  Manage Sites > your site > Settings.
8. You should now be ready to use the jobs.

# Testing
## Running unit tests

You can run `npm run test` to execute all unit tests in the project. Run `npm run cover` to get coverage information. Coverage will be available in `coverage` folder under root directory.

* UNIT test code coverage:
1. Open a terminal and navigate to the root directory of the link_lengow repository.
2. Enter the command: `npm run cover`.
3. Examine the report that is generated. For example: `Writing coverage reports at [link_lengow/coverage/lcov-report]`
3. Navigate to this directory on your local machine, open up the index.html file. This file contains a detailed report.

## Linting your code ##
`npm run lint` - Execute linting for all JavaScript and SCSS files in the project. You should run this command before committing your code.

## Contact ##
In case of technical issue, customers can raise a ticket by writing to the Lengow technical support team from this URL: https://help.lengow.com/hc/fr/requests/new