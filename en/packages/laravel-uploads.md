# laravel-uploads

`innoboxrr/laravel-uploads` **2.1.1** gives file uploads a model of their own (`Upload`), with soft deletes and a small API to upload, display, delete and restore. When files are scattered across a dozen tables, you lose track of what is on disk. A dedicated model records what each user uploaded and which record it belongs to.

Files are addressed by UUID rather than a sequential id, so a file URL doesn't reveal how many files exist or let anyone enumerate them.

## Install

```bash
composer require innoboxrr/laravel-uploads
php artisan migrate
```

It requires PHP `^8.3`, `illuminate/support ^13.0`, `innoboxrr/traits ^2.1`, `intervention/image ^3.11` and `intervention/image-laravel ^1.2`. It expects from the application:

- **Sanctum.** Every route except `display` uses `auth:sanctum`, although the package doesn't declare it in `require`.
- **A `users` table.** `uploads.user_id` is a foreign key to it.
- **`isAdmin()` on the user** (optional). A user for whom it returns `true` can manage any file.
- **GD or Imagick** (optional). Without either, images are uploaded uncompressed.

## Configuration

`config/laravel-uploads.php`:

| Key | Default | What it decides |
|---|---|---|
| `disk` | `env('LARAVEL_UPLOADS_DISK', 's3')` | Disk where files are stored |
| `max_size` | `env('LARAVEL_UPLOADS_MAX_SIZE', 10240)` | Maximum size in kilobytes |
| `allowed_mimes` | `jpg`, `jpeg`, `png`, `gif`, `webp`, `pdf`, `doc`, `docx`, `xls`, `xlsx`, `ppt`, `pptx`, `odt`, `ods`, `csv`, `txt` | Extensions for the `mimes` rule, which detects them from the file content. An empty list disables the type check |
| `compress_images` | `true` | Shrink JPEG, PNG and GIF before storing them |
| `compress_images_quality` | `60` | Compression quality |
| `compress_images_max_width` | `1024` | Maximum width in pixels |
| `production_dir` | `files` | Directory inside the disk when `APP_ENV` is `production` |
| `development_dir` | `test` | Directory in any other environment |
| `user_class`, `excel_view`, `notification_via`, `export_disk` | — | Not used by the package |

SVG is left out on purpose: it is served inline and can run scripts.

## Environment variables

| Variable | Default | Use |
|---|---|---|
| `LARAVEL_UPLOADS_DISK` | `s3` | `disk`. An application without S3 uses `public` or `local` |
| `LARAVEL_UPLOADS_MAX_SIZE` | `10240` | `max_size`, in KB |
| `APP_ENV` | — | Chooses between `production_dir` and `development_dir` |

## Publishing

| Tag | What it copies |
|---|---|
| `config` | `config/laravel-uploads.php` |

```bash
php artisan vendor:publish --provider="Innoboxrr\LaravelUploads\Providers\AppServiceProvider" --tag=config
```

::: warning Pass the provider
The package README says `vendor:publish --tag=config` without `--provider`. That publishes the configuration of every package using the `config` tag.
:::

## Migrations

They load from the package.

| Migration | What it does |
|---|---|
| `create_uploads_table` | `id`, `uuid`, `filename`, `mime_type`, `extension`, `size` (bytes, as text), `path`, `disk`, `visibility` (default `public`), `uploadable_type` and `uploadable_id` (nullable), `user_id` (FK to `users`, cascade delete), timestamps and `deleted_at` |
| `add_upload_uuid_indices_table` | `idx_uploads_uuid` index on `uuid` |

## Commands

It registers no commands.

## HTTP routes

In the `api` group, under `/lu/upload`, named `lu.upload.*`. The controller requires `auth:sanctum` on everything except `display`.

| Method | URI | Name | Fields | Response |
|---|---|---|---|---|
| POST | `/lu/upload/file` | `lu.upload.file` | Multipart: `file` (required, `max_size`, `allowed_mimes`), `visibility` (`public` or `private`; default `public`), `uploadable_type`, `uploadable_id` | 201 with the `Upload`. 422 when validation fails |
| GET | `/lu/upload/{upload_uuid}/display/{filename?}` | `lu.upload.display` | — | Streams the file `inline`. Public. 404 when the record or the file is missing |
| DELETE | `/lu/upload/delete` | `lu.upload.delete` | `upload_id` | Soft delete; the `Upload` |
| POST | `/lu/upload/restore` | `lu.upload.restore` | `upload_id` | The `Upload` |
| DELETE | `/lu/upload/force-delete` | `lu.upload.force.delete` | `upload_id` | Deletes the record **and the stored file** |

An upload response:

```json
{
  "id": 1,
  "uuid": "9b1d...",
  "filename": "avatar.png",
  "mime_type": "image/png",
  "extension": "png",
  "size": 48213,
  "path": "files/Hk3...png",
  "disk": "public",
  "visibility": "public",
  "uploadable_type": null,
  "uploadable_id": null,
  "user_id": 7,
  "url": "https://app.test/lu/upload/9b1d.../display/avatar.png",
  "uri": "/lu/upload/9b1d.../display/avatar.png",
  "actions": [ ... ]
}
```

Without `JsonResource::withoutWrapping()` the same object arrives inside `data`. `url` is absolute and `uri` is relative. `actions` holds three actions (view, edit, delete) inherited from the old interface.

**How a file is served.** `display` works with the `s3`, `public` and `local` disks:
- **Reading.** It reads through the disk's `readStream`, so the file doesn't need to be public on the disk.
- **Headers.** It sends `Content-Type`, `Content-Length`, `Cache-Control: public, max-age=2628000` and `Content-Disposition: inline`.
- **Caching.** It caches the disk and path for 60 seconds under `laravel-uploads.display.{uuid}`, and clears that entry on delete or restore.
- **File name.** The file name in the URL is decorative and optional.

**Visibility.** `visibility` is applied to the object on disk, but `display` doesn't check it: anyone holding the UUID can download the file.

## Policies and gates

`UploadPolicy` is registered with `Gate::policy()` and type-hints `Illuminate\Contracts\Auth\Authenticatable`, never a concrete user class.

| Ability | Who |
|---|---|
| `upload` | Any authenticated user |
| `display` | Anyone (the route doesn't check it) |
| `delete`, `restore` | Whoever uploaded the file, or an admin |
| `forceDelete` | Admins only |

"Admin" means the user has `isAdmin()` and it returns `true`. Without that method nobody is an admin, and the answer is 403.

## Extension points

Attach uploads to your models with the package's traits, and send `uploadable_type` (the class) and `uploadable_id` when uploading:

```php
use Innoboxrr\LaravelUploads\Support\Traits\HasUploads; // morphMany: $model->uploads
use Innoboxrr\LaravelUploads\Support\Traits\HasUpload;  // morphOne:  $model->upload

class Invoice extends Model
{
    use HasUploads;
}

$invoice->uploads; // uploads sent with this invoice's uploadable_type/uploadable_id
```

On a model LaraPack generates, add the trait inside its `Relations` trait, which is an extension point and is never regenerated. See [What is generated and where your code goes](/en/larapack/generated-code).

::: warning uploadable_type isn't checked against your models
The upload accepts any text in `uploadable_type` and any id in `uploadable_id`, so an authenticated user can attach a file to any record. If that matters, verify ownership in your code before trusting `$model->uploads`.
:::

## In the base application

- **Installation.**
  - `app:setup` adds `LARAVEL_UPLOADS_DISK=public` to `.env`, because a new application has no S3.
  - `app:install` migrates and runs `storage:link`.
- **Profile photo**, at `/admin/profile`:
  1. The image is uploaded to `lu.upload.file` with `file` and `visibility=public`.
  2. The response's relative `uri` (or `url` when it's missing) is saved as the user's `avatar` meta through `api.app.user.update`. The `uri` is stored rather than the `url` so it keeps working if the domain changes.
- **Removing the photo** sends `avatar: ''`, which deletes the meta.
- **Orphaned files.** Neither changing nor removing the photo deletes the previous upload, so those rows and their files stay on disk.

See [Authentication and users](/en/app-base/auth).

## Upgrading

### From 2.0 to 2.1

- **Uploads are validated** and answer 422 instead of 500. `file` is required, with a maximum size and allowed types, and `visibility` only accepts `public` or `private`.
- **`UploadPolicy` changed.** Only the owner or an admin can delete and restore; only an admin can delete permanently. Before, any authenticated user could delete anyone's files.
- **`force-delete`** no longer always answers 403, and it now also deletes the file from disk.
- **The file is stored with the requested visibility.** Before, it was always `public`.
- **New keys:** `max_size` and `allowed_mimes`. `disk` is read from `LARAVEL_UPLOADS_DISK` and still defaults to `s3`.
- **`innoboxrr/traits` and `intervention/image`** moved to `require`.

### From 2.1.0 to 2.1.1

Provider fixes: the application no longer registers its routes twice, the verification email is no longer sent twice, and `UploadPolicy` is actually registered. URIs, names, middleware and responses are unchanged.

## Pitfalls

- **Every upload fails on a new application.** The default disk is `s3`. Set `LARAVEL_UPLOADS_DISK=public` or `local`.
- **422 for a file that looks fine.** It's an SVG, it exceeds `max_size`, or it exceeds PHP's limits (`upload_max_filesize`, `post_max_size`): a file PHP rejects arrives invalid.
- **A `private` file downloads anyway.** `display` doesn't check visibility.
- **`delete` without `upload_id` answers 404, not 422.** The upload is looked up before validation.
- **`url` points to another domain.** It's built from the request host; store `uri`.
- **Files go to `test/` on staging.** `development_dir` is used in every environment other than `production`.
- **Images aren't compressed.** GD and Imagick are both missing, or `compress_images` is `false`.
