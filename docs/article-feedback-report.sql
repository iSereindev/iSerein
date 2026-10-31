-- Run in Supabase SQL Editor to compare responses by article.
select article_id, title, topic, thumbs_up, thumbs_down, comments,
       positive_percent, last_feedback_at
from public.article_feedback_summary
order by (thumbs_up + thumbs_down) desc, last_feedback_at desc nulls last;

-- Private messages. The visitor-facing app cannot read these.
select a.title, a.topic, f.reaction, f.comment, f.updated_at
from public.article_feedback f
join public.articles a on a.id = f.article_id
where f.comment is not null
order by f.updated_at desc;
