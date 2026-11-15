// A course's category is a plain text property of the course (empty means "General"), and its authors are a short list of
// { displayName, bio } kept on the course too. There is no separate catalog to manage.
const GENERAL = { _id: null, name: "General", slug: "general" };

// "Computer Science" -> "computer-science". Used for the category filter in the address.
const slugOf = (name) => String(name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const categoryOf = (course) => {
  const name = typeof course.category === "string" ? course.category.trim() : "";
  return name ? { _id: null, name, slug: slugOf(name) || "general" } : GENERAL;
};

// Adds { category: { name, slug }, authors: [{ displayName, bio }] } to course objects (plain, from .lean()).
// Kept async so callers do not change.
const attachMeta = async (courses) => {
  const list = Array.isArray(courses) ? courses : [courses];
  const out = list.map((course) => ({
    ...course,
    category: categoryOf(course),
    authors: (course.authors || []).map((author) => ({ displayName: author.displayName, bio: author.bio || "" }))
  }));
  return Array.isArray(courses) ? out : out[0];
};

module.exports = { attachMeta, GENERAL, slugOf, categoryOf };
