# aws-file-manager

`innoboxrr/aws-file-manager` **2.0.0** gives every authenticated user a private folder in an S3 bucket. A JSON API lets them browse it, upload files, create folders, delete files and change their visibility. There is no facade: use it over HTTP, or resolve `S3Service` from the container.

::: warning In the base application it is installed and has no UI
The package README says it is the backend of the file manager in the admin UI that laravel-setup installs. **That file manager doesn't exist:** no Vue or React screen calls its routes, and the menu doesn't link to it. Its routes are still registered and appear in `routes.json`. Read [In the base application](#in-the-base-application) before configuring S3.
:::

## Install

```bash
composer require innoboxrr/aws-file-manager
```

It requires PHP `^8.3`, `laravel/framework ^13.0`, `laravel/sanctum ^4.3`, `aws/aws-sdk-php ^3.316`, `league/flysystem-aws-s3-v3 ^3.28`, and an S3 bucket. The providers are auto-discovered.

## Configuration

The configuration loads without publishing it, under `aws-file-manager`.

| Key | Variable | Default | What it decides |
|---|---|---|---|
| `root` | — | `file-manager` | Prefix holding one folder per user |
| `bucket` | `AWS_BUCKET` | — | Required |
| `region` | `AWS_DEFAULT_REGION` | — | Required |
| `url` | `AWS_URL` | — | Base of the index's `source` field |
| `credentials.key` | `AWS_ACCESS_KEY_ID` | — | Optional. When empty, the AWS SDK's default credential chain is used (environment, profile, instance role) |
| `credentials.secret` | `AWS_SECRET_ACCESS_KEY` | — | Same as above |
| `use_acl` | `AWS_FILE_MANAGER_USE_ACL` | `false` | Whether visibility is managed with object ACLs |

Until `AWS_BUCKET` and `AWS_DEFAULT_REGION` are set, every route answers **503** with `{"message": "The file manager is not configured. Set AWS_BUCKET and AWS_DEFAULT_REGION."}`.

### ACLs and visibility

S3 buckets created since April 2023 have ACLs disabled (Object Ownership: *Bucket owner enforced*). They reject any request that carries an `ACL`, even `private`. That is why `use_acl` is off by default.

| | `use_acl = false` (new buckets) | `use_acl = true` (buckets with ACLs) |
|---|---|---|
| Upload | No ACL, so the file is private. Asking for `public` answers 422 before anything is uploaded | Stored with `private` or `public-read` |
| Change visibility | 422, explaining that ACLs are disabled | Sets the object ACL |
| `information.visibility` in the index | Always `private`: public access is up to the bucket policy | Read from the ACL |

With ACLs disabled, make files public with a bucket policy or CloudFront. If `use_acl` is on and the bucket rejects ACLs anyway, the API answers 422 saying so, instead of an AWS error. Both endpoints accept `private`, `public` and `public-read`; `public` and `public-read` mean the same.

## Environment variables

```dotenv
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=my-bucket
AWS_URL=https://my-bucket.s3.amazonaws.com
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_FILE_MANAGER_USE_ACL=false
```

These are the same variables Laravel's `s3` disk uses, so configuring S3 for anything else also activates this package.

## Publishing

| Tag | What it copies |
|---|---|
| `config` | `config/aws-file-manager.php` |

```bash
php artisan vendor:publish --provider="Innoboxrr\AwsFileManager\Providers\AppServiceProvider" --tag=config
```

## Migrations

It ships no migrations; files live in S3.

## Commands

It registers no commands.

## HTTP routes

The routes are in the `web` group (session and CSRF), and the controller requires `auth:sanctum`. A POST without `X-XSRF-TOKEN` answers 419; a guest asking for JSON gets 401.

| Method | URI | Name | Fields | Response |
|---|---|---|---|---|
| GET | `/afm/file_manager/index` | `afm.file_manager.index` | `directory` (optional) | `{ files: [...], currentFile }` |
| POST | `/afm/file_manager/upload` | `afm.file_manager.upload` | `files[]` (required), `directory`, `visibility` | `[{ message, file }]`, one per file |
| POST | `/afm/file_manager/create-directory` | `afm.file_manager.create-directory` | `directory` (required) | `{ message, directory }`. 400 if it already exists |
| POST | `/afm/file/delete` | `afm.file.delete` | `file` (required) | `{ message }` |
| POST | `/afm/file/change-visibility` | `afm.file.change-visibility` | `file`, `visibility` (required) | `{ message }`. 404 if the file doesn't exist; 422 when ACLs are off |

Validation errors answer 422 with `message` and `errors`.

**Each user's folder.** Each user works inside `file-manager/{id}/` and can't reach anything else:
- **`directory`** (index, upload, create folder) is relative to the user's folder: `docs` means `file-manager/1/docs/`.
- **`file`** (delete, change visibility) is either the full key, as returned by the upload (`file`) and the index (`key`), or a path relative to the user's folder.
- **Anything outside that folder** answers 403 with `{"message": "Access to this path is denied."}`. That includes another user's key, `file-manager/10/...` for user 1, and any path with `..` segments.

**The index.**
- **Folder.** It creates the requested folder if it doesn't exist.
- **Order.** Folders come first, then files. `currentFile` is the first file, marked `"current": true`.
- **Each file** carries `name`, `key`, `size` (human-readable text), `source` (`AWS_URL` plus the key), `signedUrl` (valid for 20 minutes), `url` and `information` (`type`, `created_at`, `updated_at`, `visibility`).
- **Uploads** store the file's `Content-Type`, so browsers display images and PDFs instead of downloading them.

## Policies and gates

There are no policies or abilities. The only barrier is the user's folder: **any signed-in user** can use all five routes on their own folder.

## Extension points

`S3Service` is registered as a singleton and can be replaced:

```php
use Innoboxrr\AwsFileManager\Services\S3Service;

$s3 = app(S3Service::class);
$bucket = config('aws-file-manager.bucket');

$s3->putObject($bucket, 'file-manager/1/report.pdf', fopen($path, 'r'), 'private', 'application/pdf');
$url = $s3->getSignedUrl($bucket, 'file-manager/1/report.pdf');
$s3->deleteObject($bucket, 'file-manager/1/report.pdf');

// Your own client, for example in an application provider:
$this->app->instance(S3Service::class, new S3Service($s3Client));
```

It also exposes `listObjects`, `getObjectMetadata`, `getObjectAcl`, `putObjectAcl`, `directoryExists`, `createDirectory`, `userRoot`, `userFileKey`, `validateUserPath`, `usesAcl` and `getObjectUrl`.

## In the base application

- **Installation.** `app:setup` requires `innoboxrr/aws-file-manager ^2.0` and `league/flysystem-aws-s3-v3 ^3.0`. It writes no `AWS_*` variables and adds no menu link.
- **Unconfigured.** Until you configure S3, the `afm.*` routes answer 503 to anyone who calls them.
- **Configured.** As soon as you set `AWS_BUCKET` and `AWS_DEFAULT_REGION`, even for something else such as storing laravel-uploads files on S3, any registered user can create folders and upload files to your bucket through this API.

::: warning Uploads have no type or size limit
`upload` only checks that each item in `files[]` is a file. There is no type list and no maximum size beyond PHP's own limits. If you configure S3 in the base application and don't plan to use the file manager, restrict these routes (for example, by requiring an admin) or remove the package from `composer.json`.
:::

## Upgrading

### From 1.x to 2.0

- **ACLs.** If your bucket supports object ACLs and you want to keep uploading public files or changing their visibility, set `AWS_FILE_MANAGER_USE_ACL=true`. Without it, uploads are private, and asking for `public` or changing visibility answers 422.
- **User folder.** Delete and change-visibility no longer reach keys outside `file-manager/{id}/`; they answer 403.
- **Added:**
  - `key` on every index entry;
  - relative paths on delete and change-visibility;
  - `S3Service::deleteObject()`;
  - the 503 when the bucket or region is missing.
- **Also changed:**
  - without keys, the SDK credential chain is used;
  - changing the visibility of a missing file answers 404;
  - `composer.json` requires `laravel/framework ^13.0` and `laravel/sanctum ^4.3`.
- **Fixed:** delete always answered 500, and nothing could be uploaded to a new bucket.

## Pitfalls

- **Everything answers 503.** `AWS_BUCKET` or `AWS_DEFAULT_REGION` is missing, or the configuration is cached. Run `php artisan config:clear`.
- **422 when uploading as public or changing visibility.** ACLs are off (`use_acl=false`), or the bucket rejects them.
- **403 on delete.** The key isn't in the user's folder, or it contains `..`.
- **Uploading a file with the same name replaces it.** The key is the folder plus the original file name, with no warning.
- **`source` has no domain.** `AWS_URL` is missing.
- **`signedUrl` stops working.** It expires after 20 minutes; request the index again.
- **419 on a POST.** The routes are in the `web` group and need the CSRF token.
