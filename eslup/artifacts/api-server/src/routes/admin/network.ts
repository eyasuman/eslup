// The workspace has two API artifact copies during the migration. Keep this
// runtime on the canonical implementation so both proxy targets enforce the
// same authorization, validation, DTO normalization, and signed-file policy.
// @ts-ignore The canonical source is outside this duplicate artifact root.
export { default } from "../../../../../../artifacts/api-server/src/routes/admin/network";