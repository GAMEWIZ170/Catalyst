import { useEffect, useState } from "react";
import { api } from "../api/client";
import AdminLayout from "../components/admin/AdminLayout";
import ConfirmDialog from "../components/admin/ConfirmDialog";
import ImageField from "../components/admin/ImageField";
import InlineRename from "../components/admin/InlineRename";
import StatusMessage from "../components/admin/StatusMessage";
import { Button, Dialog, TextArea, TextField } from "../components/ui";
import { ErrorState, Loading } from "./Courses";

const emptyAuthor = { displayName: "", bio: "", avatar: null };

// Where the admin keeps the lists that courses pick from: categories and authors.
export default function AdminCatalog() {
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [authorForm, setAuthorForm] = useState(null); // null = closed; otherwise { id?, displayName, bio, avatar }
  const [avatarOk, setAvatarOk] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null); // { kind: "category" | "author", item }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [cats, auths] = await Promise.all([api.getAdminCategories(), api.getAdminAuthors()]);
      setCategories(cats.data || []);
      setAuthors(auths.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function run(action, done) {
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(done);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function addCategory(event) {
    event.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    run(() => api.createCategory({ name }), "Category added").then(() => setNewCategory(""));
  }

  async function saveAuthor(event) {
    event.preventDefault();
    setSaving(true);
    const body = { displayName: authorForm.displayName.trim(), bio: authorForm.bio.trim(), avatar: authorForm.avatar };
    await run(() => (authorForm.id ? api.updateAuthor(authorForm.id, body) : api.createAuthor(body)), authorForm.id ? "Author saved" : "Author added");
    setSaving(false);
    setAuthorForm(null);
  }

  async function confirmDelete() {
    const target = confirm;
    setConfirm(null);
    await run(() => (target.kind === "category" ? api.deleteCategory(target.item._id) : api.deleteAuthor(target.item._id)), target.kind === "category" ? "Category deleted" : "Author deleted");
  }

  if (loading) return <AdminLayout><Loading /></AdminLayout>;
  return <AdminLayout>
    <div className="admin-heading"><h1>Catalog</h1></div>
    <StatusMessage message={error || message} error={Boolean(error)} />
    {error && !categories.length && !authors.length && <ErrorState message={error} onRetry={load} />}
    <section className="admin-editor-section" aria-labelledby="categories-heading">
      <h2 id="categories-heading">Categories</h2>
      <p className="muted">Courses with no category show under General. Deleting a category moves its courses to General.</p>
      <ul className="catalog-list">
        {categories.map((category) => <li key={category._id}>
          <InlineRename name={category.name} onSave={(name) => run(() => api.updateCategory(category._id, { name }), "Category renamed")} />
          <Button variant="secondary" type="button" onClick={() => setConfirm({ kind: "category", item: category })}>Delete</Button>
        </li>)}
        {categories.length === 0 && <li className="muted">No categories yet.</li>}
      </ul>
      <form className="inline-add-form" onSubmit={addCategory}>
        <input required maxLength="60" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} aria-label="New category name" />
        <Button variant="primary" type="submit">Add category</Button>
      </form>
    </section>
    <section className="admin-editor-section" aria-labelledby="authors-heading">
      <h2 id="authors-heading">Authors</h2>
      <p className="muted">An author is a name shown on a course. Deleting an author removes them from every course.</p>
      <ul className="catalog-list">
        {authors.map((author) => <li key={author._id}>
          <span><strong>{author.displayName}</strong>{author.bio && <span className="muted"> {author.bio}</span>}</span>
          <span className="catalog-actions">
            <Button variant="secondary" type="button" onClick={() => { setAvatarOk(true); setAuthorForm({ id: author._id, displayName: author.displayName, bio: author.bio || "", avatar: author.avatar || null }); }}>Edit</Button>
            <Button variant="secondary" type="button" onClick={() => setConfirm({ kind: "author", item: author })}>Delete</Button>
          </span>
        </li>)}
        {authors.length === 0 && <li className="muted">No authors yet.</li>}
      </ul>
      <Button variant="secondary" type="button" onClick={() => { setAvatarOk(true); setAuthorForm(emptyAuthor); }}>Add author</Button>
    </section>
    <Dialog open={Boolean(authorForm)} onClose={() => setAuthorForm(null)} title={authorForm?.id ? "Edit author" : "New author"} actions={<>
      <Button variant="secondary" type="button" onClick={() => setAuthorForm(null)}>Cancel</Button>
      <Button type="submit" form="author-form" loading={saving} disabled={!avatarOk}>Save</Button>
    </>}>
      {authorForm && <form id="author-form" className="form-stack" onSubmit={saveAuthor}>
        <TextField label="Display name" required minLength="2" maxLength="80" value={authorForm.displayName} onChange={(event) => setAuthorForm({ ...authorForm, displayName: event.target.value })} />
        <TextArea label="Short bio (optional)" maxLength="300" value={authorForm.bio} onChange={(event) => setAuthorForm({ ...authorForm, bio: event.target.value })} />
        <ImageField label="Picture (optional)" value={authorForm.avatar} onChange={(avatar) => setAuthorForm((current) => ({ ...current, avatar }))} onValidityChange={setAvatarOk} compact />
      </form>}
    </Dialog>
    <ConfirmDialog open={Boolean(confirm)} title={`Delete ${confirm?.kind || "item"}?`} description={confirm?.kind === "category" ? "Its courses move to General." : "They are removed from every course."} confirmLabel="Delete" onConfirm={confirmDelete} onCancel={() => setConfirm(null)} />
  </AdminLayout>;
}
