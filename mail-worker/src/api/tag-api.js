import app from '../hono/hono';
import tagService from '../service/tag-service';
import userContext from '../security/user-context';
import result from '../model/result';

// --- Admin tag CRUD (global) ---

app.post('/tag/create', async (c) => {
	const data = await tagService.create(c, await c.req.json());
	return c.json(result.ok(data));
});

app.put('/tag/update', async (c) => {
	const data = await tagService.update(c, await c.req.json());
	return c.json(result.ok(data));
});

app.delete('/tag/delete', async (c) => {
	await tagService.delete(c, c.req.query());
	return c.json(result.ok());
});

// Global list — all users get the same tags
app.get('/tag/list', async (c) => {
	const data = await tagService.list(c);
	return c.json(result.ok(data));
});

// --- Per-user email-tag assignments ---

app.post('/tag/addToEmail', async (c) => {
	await tagService.addToEmail(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.delete('/tag/removeFromEmail', async (c) => {
	await tagService.removeFromEmail(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok());
});

// Multi-tag filtered email list
app.get('/tag/emails', async (c) => {
	const data = await tagService.emailsByTags(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok(data));
});
