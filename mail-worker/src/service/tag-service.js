import orm from '../entity/orm';
import { tag } from '../entity/tag';
import { emailTag } from '../entity/email-tag';
import email from '../entity/email';
import { star } from '../entity/star';
import { isDel } from '../const/entity-const';
import BizError from '../error/biz-error';
import { and, desc, eq, lt, inArray, count, sql } from 'drizzle-orm';
import attService from './att-service';
import { t } from '../i18n/i18n';

const tagService = {

	// --- Tag CRUD (admin-only, global) ---

	async create(c, params) {
		const { name, color } = params;

		if (!name || !name.trim()) {
			throw new BizError(t('tagNameEmpty'));
		}

		// Check duplicate name (global)
		const exist = await orm(c).select().from(tag)
			.where(eq(tag.name, name.trim()))
			.get();

		if (exist) {
			throw new BizError(t('tagNameExists'));
		}

		return await orm(c).insert(tag).values({
			userId: 0,
			name: name.trim(),
			color: color || '#409EFF'
		}).returning().get();
	},

	async update(c, params) {
		const { tagId, name, color } = params;

		const tagRow = await orm(c).select().from(tag)
			.where(eq(tag.tagId, tagId))
			.get();

		if (!tagRow) {
			throw new BizError(t('tagNotExist'));
		}

		// Check duplicate name (exclude self)
		if (name && name.trim() !== tagRow.name) {
			const exist = await orm(c).select().from(tag)
				.where(eq(tag.name, name.trim()))
				.get();
			if (exist) {
				throw new BizError(t('tagNameExists'));
			}
		}

		const updateData = {};
		if (name) updateData.name = name.trim();
		if (color) updateData.color = color;

		return await orm(c).update(tag).set(updateData)
			.where(eq(tag.tagId, tagId))
			.returning().get();
	},

	async delete(c, params) {
		const { tagId } = params;

		// Delete all email_tag entries for this tag (all users)
		await orm(c).delete(emailTag)
			.where(eq(emailTag.tagId, tagId))
			.run();

		// Delete the tag itself
		await orm(c).delete(tag)
			.where(eq(tag.tagId, tagId))
			.run();
	},

	// Global list — all users see the same tags
	async list(c) {
		return await orm(c).select().from(tag)
			.orderBy(desc(tag.tagId))
			.all();
	},

	// --- Email-tag assignments (per-user) ---

	async addToEmail(c, params, userId) {
		const { tagId, emailId } = params;

		// Check tag exists (global)
		const tagRow = await orm(c).select().from(tag)
			.where(eq(tag.tagId, tagId))
			.get();

		if (!tagRow) {
			throw new BizError(t('tagNotExist'));
		}

		// Check email exists and belongs to user
		const emailRow = await orm(c).select().from(email)
			.where(and(eq(email.emailId, emailId), eq(email.userId, userId), eq(email.isDel, isDel.NORMAL)))
			.get();

		if (!emailRow) {
			throw new BizError(t('tagEmailNotExist'));
		}

		// Check if already assigned
		const exist = await orm(c).select().from(emailTag)
			.where(and(
				eq(emailTag.userId, userId),
				eq(emailTag.emailId, emailId),
				eq(emailTag.tagId, tagId)
			)).get();

		if (exist) {
			return;
		}

		await orm(c).insert(emailTag).values({ userId, emailId, tagId }).run();
	},

	async removeFromEmail(c, params, userId) {
		const { tagId, emailId } = params;

		await orm(c).delete(emailTag)
			.where(and(
				eq(emailTag.userId, userId),
				eq(emailTag.emailId, emailId),
				eq(emailTag.tagId, tagId)
			)).run();
	},

	// Filter emails by one or more tags (intersection — email must have ALL selected tags)
	async emailsByTags(c, params, userId) {
		let { tagIds, emailId, size } = params;
		emailId = Number(emailId);
		size = Number(size);

		if (!emailId) {
			emailId = 9999999999;
		}

		// tagIds comes as comma-separated string
		const tagIdList = String(tagIds).split(',').map(Number).filter(n => !isNaN(n) && n > 0);

		if (tagIdList.length === 0) {
			return { list: [] };
		}

		// For multi-tag intersection: find emails that have ALL of the specified tags
		// GROUP BY email_id HAVING COUNT(DISTINCT tag_id) = <number of tags>
		const matchingEmailIds = await orm(c)
			.select({ emailId: emailTag.emailId })
			.from(emailTag)
			.where(and(
				eq(emailTag.userId, userId),
				inArray(emailTag.tagId, tagIdList)
			))
			.groupBy(emailTag.emailId)
			.having(sql`COUNT(DISTINCT ${emailTag.tagId}) = ${tagIdList.length}`)
			.all();

		const filteredEmailIds = matchingEmailIds.map(r => r.emailId);

		if (filteredEmailIds.length === 0) {
			return { list: [] };
		}

		const list = await orm(c).select({
			...email,
			starId: star.starId
		}).from(email)
			.leftJoin(star, and(
				eq(star.emailId, email.emailId),
				eq(star.userId, userId)
			))
			.where(and(
				inArray(email.emailId, filteredEmailIds),
				eq(email.isDel, isDel.NORMAL),
				lt(email.emailId, emailId)
			))
			.orderBy(desc(email.emailId))
			.limit(size)
			.all();

		const emailList = list.map(item => ({
			...item,
			isStar: item.starId != null ? 1 : 0
		}));

		// Add attachments
		const eIds = emailList.map(item => item.emailId);
		const attsList = await attService.selectByEmailIds(c, eIds);
		emailList.forEach(emailRow => {
			const atts = attsList.filter(attsRow => attsRow.emailId === emailRow.emailId);
			emailRow.attList = atts;
		});

		// Add tags
		await this.enrichEmailsWithTags(c, emailList, userId);

		return { list: emailList };
	},

	async tagsByEmailIds(c, emailIds, userId) {
		if (!emailIds || emailIds.length === 0) return [];

		const results = await orm(c).select({
			emailTagId: emailTag.emailTagId,
			emailId: emailTag.emailId,
			tagId: emailTag.tagId,
			tagName: tag.name,
			tagColor: tag.color
		}).from(emailTag)
			.innerJoin(tag, eq(tag.tagId, emailTag.tagId))
			.where(and(
				eq(emailTag.userId, userId),
				inArray(emailTag.emailId, emailIds)
			))
			.all();

		return results;
	},

	async enrichEmailsWithTags(c, emailList, userId) {
		if (!emailList || emailList.length === 0) return;

		// Get userId from the first email if not passed
		if (!userId && emailList[0]) {
			userId = emailList[0].userId;
		}

		const emailIds = emailList.map(item => item.emailId);
		const tagResults = await this.tagsByEmailIds(c, emailIds, userId);

		emailList.forEach(emailRow => {
			emailRow.tagList = tagResults
				.filter(tr => tr.emailId === emailRow.emailId)
				.map(tr => ({
					tagId: tr.tagId,
					name: tr.tagName,
					color: tr.tagColor
				}));
		});
	},

	async removeByEmailIds(c, emailIds) {
		if (!emailIds || emailIds.length === 0) return;
		await orm(c).delete(emailTag).where(inArray(emailTag.emailId, emailIds)).run();
	},

	async removeByUserIds(c, userIds) {
		if (!userIds || userIds.length === 0) return;
		await orm(c).delete(emailTag).where(inArray(emailTag.userId, userIds)).run();
	},

	async removeByAccountId(c, accountId) {
		const emails = await orm(c).select({ emailId: email.emailId })
			.from(email)
			.where(eq(email.accountId, accountId))
			.all();
		const emailIds = emails.map(e => e.emailId);
		await this.removeByEmailIds(c, emailIds);
	}
};

export default tagService;
