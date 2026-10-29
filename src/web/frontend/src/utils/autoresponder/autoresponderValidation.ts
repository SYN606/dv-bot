export function validateAutoresponder(form: Record<string, any>) {
  const errors: Record<string, string> = {};

  if (!form.trigger || !form.trigger.trim()) {
    errors.trigger = "Trigger is required.";
  } else if (form.matchMode === "regex") {
    try {
      new RegExp(form.trigger);
    } catch (e) {
      errors.trigger = "Invalid Regular Expression.";
    }
  }

  const hasReply = Boolean(form.reply && form.reply.trim().length > 0);
  const hasEmbedTitle = Boolean(form.isEmbed && form.embedTitle && form.embedTitle.trim().length > 0);
  const hasReactions = Boolean(Array.isArray(form.reactions) && form.reactions.length > 0);

  if (!hasReply && !hasEmbedTitle && !hasReactions) {
    errors.reply = "You must provide a reply message, embed, or at least one reaction.";
  }

  if (form.isEmbed && form.imageUrl) {
    try {
      new URL(form.imageUrl);
    } catch (e) {
      errors.imageUrl = "Invalid Image URL.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
