# Central Model Registry for Alembic
# Import all models here so Alembic can discover them through Base.metadata
from app.db.base_class import Base  # noqa
from app.models.user import User  # noqa
from app.models.story import Story  # noqa
from app.models.chapter import Chapter  # noqa
from app.models.character import Character  # noqa
from app.models.canon_memory import CanonMemory  # noqa
from app.models.emotional_memory import EmotionalMemory  # noqa
from app.models.memory_processing_job import MemoryProcessingJob  # noqa
from app.models.writer_review_queue import WriterReviewQueueItem  # noqa
from app.models.chat_session import ChatSession  # noqa
from app.models.chat_message import ChatMessage  # noqa
from app.models.live_draft_context import LiveDraftContext  # noqa
from app.models.chapter_comment import ChapterComment  # noqa
from app.models.chapter_vote import ChapterVote  # noqa
from app.models.pinned_memory import PinnedMemory  # noqa
from app.models.story_memory_chunk import StoryMemoryChunk  # noqa
from app.models.email_verification_otp import EmailVerificationOTP  # noqa
from app.models.notification import Notification  # noqa
from app.models.community import Community, CommunityMember  # noqa
from app.models.community_post import CommunityPost, CommunityPostComment, CommunityPostLike  # noqa
from app.models.library import ReadingProgress, ReadingList, ReadingListItem, SavedStory  # noqa
from app.models.persona import Persona  # noqa
from app.models.story_vote import StoryVote  # noqa
from app.models.follow import UserFollow  # noqa
from app.models.chat_message_pin import ChatMessagePin  # noqa
