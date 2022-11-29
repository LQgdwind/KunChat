from typing import List, Tuple

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from analytics.models import BaseCount
from zerver.lib.rate_limiter import RateLimitedObject
from zerver.lib.rate_limiter import rules as rate_limiter_rules
from zerver.models import AbstractPushDeviceToken, AbstractRealmAuditLog


def get_remote_server_by_uuid(uuid: str) -> "RemoteAlohaServer":
    try:
        return RemoteAlohaServer.objects.get(uuid=uuid)
    except ValidationError:
        raise RemoteAlohaServer.DoesNotExist()


class RemoteAlohaServer(models.Model):
    """Each object corresponds to a single remote Aloha server that is
    registered for the Mobile Push Notifications Service via
    `manage.py register_server`.
    """

    UUID_LENGTH = 36
    API_KEY_LENGTH = 64
    HOSTNAME_MAX_LENGTH = 128

    # The unique UUID (`aloha_org_id`) and API key (`aloha_org_key`)
    # for this remote server registration.
    uuid = models.UUIDField(unique=True)
    api_key = models.CharField(max_length=API_KEY_LENGTH)

    # The hostname and contact details are not verified/trusted. Thus,
    # they primarily exist so that we can communicate with the
    # maintainer of a server about abuse problems.
    hostname = models.CharField(max_length=HOSTNAME_MAX_LENGTH)
    contact_email = models.EmailField(blank=True, null=False)
    last_updated = models.DateTimeField("last updated", auto_now=True)

    # Whether the server registration has been deactivated.
    deactivated = models.BooleanField(default=False)

    # Plan types for self-hosted customers
    PLAN_TYPE_SELF_HOSTED = 1
    PLAN_TYPE_STANDARD = 102

    # The current billing plan for the remote server, similar to Realm.plan_type.
    plan_type = models.PositiveSmallIntegerField(default=PLAN_TYPE_SELF_HOSTED)

    def __str__(self) -> str:
        return f"<RemoteAlohaServer {self.hostname} {str(self.uuid)[0:12]}>"

    def format_requestor_for_logs(self) -> str:
        return "aloha-server:" + str(self.uuid)


class RemotePushDeviceToken(AbstractPushDeviceToken):
    """Like PushDeviceToken, but for a device connected to a remote server."""

    server = models.ForeignKey(RemoteAlohaServer, on_delete=models.CASCADE)
    # The user id on the remote server for this device
    user_id = models.BigIntegerField(null=True)
    user_uuid = models.UUIDField(null=True)

    class Meta:
        unique_together = [
            # These indexes rely on the property that in Postgres,
            # NULL != NULL in the context of unique indexes, so multiple
            # rows with the same values in these columns can exist
            # if one of them is NULL.
            ("server", "user_id", "kind", "token"),
            ("server", "user_uuid", "kind", "token"),
        ]

    def __str__(self) -> str:
        return f"<RemotePushDeviceToken {self.server} {self.user_id}>"


class RemoteAlohaServerAuditLog(AbstractRealmAuditLog):
    """Audit data associated with a remote Aloha server (not specific to a
    realm).  Used primarily for tracking registration and billing
    changes for self-hosted customers.

    In contrast with RemoteRealmAuditLog, which has a copy of data
    that is generated on the client Aloha server, this table is the
    authoritative storage location for the server's history.
    """

    server = models.ForeignKey(RemoteAlohaServer, on_delete=models.CASCADE)

    def __str__(self) -> str:
        return f"<RemoteAlohaServerAuditLog: {self.server} {self.event_type} {self.event_time} {self.id}>"


class RemoteRealmAuditLog(AbstractRealmAuditLog):
    """Synced audit data from a remote Aloha server, used primarily for
    billing.  See RealmAuditLog and AbstractRealmAuditLog for details.
    """

    server = models.ForeignKey(RemoteAlohaServer, on_delete=models.CASCADE)
    realm_id = models.IntegerField(db_index=True)
    # The remote_id field lets us deduplicate data from the remote server
    remote_id = models.IntegerField(db_index=True)

    def __str__(self) -> str:
        return f"<RemoteRealmAuditLog: {self.server} {self.event_type} {self.event_time} {self.id}>"


class RemoteInstallationCount(BaseCount):
    server = models.ForeignKey(RemoteAlohaServer, on_delete=models.CASCADE)
    # The remote_id field lets us deduplicate data from the remote server
    remote_id = models.IntegerField(db_index=True)

    class Meta:
        unique_together = ("server", "property", "subgroup", "end_time")
        index_together = [
            ["server", "remote_id"],
        ]

    def __str__(self) -> str:
        return f"<InstallationCount: {self.property} {self.subgroup} {self.value}>"


# We can't subclass RealmCount because we only have a realm_id here, not a foreign key.
class RemoteRealmCount(BaseCount):
    server = models.ForeignKey(RemoteAlohaServer, on_delete=models.CASCADE)
    realm_id = models.IntegerField(db_index=True)
    # The remote_id field lets us deduplicate data from the remote server
    remote_id = models.IntegerField(db_index=True)

    class Meta:
        unique_together = ("server", "realm_id", "property", "subgroup", "end_time")
        index_together = [
            ["property", "end_time"],
            ["server", "remote_id"],
        ]

    def __str__(self) -> str:
        return f"{self.server} {self.realm_id} {self.property} {self.subgroup} {self.value}"


class RateLimitedRemoteAlohaServer(RateLimitedObject):
    def __init__(
        self, remote_server: RemoteAlohaServer, domain: str = "api_by_remote_server"
    ) -> None:
        # Remote servers can only make API requests regarding push notifications
        # which requires ZILENCER_ENABLED and of course can't happen on API endpoints
        # inside Tornado.
        assert not settings.RUNNING_INSIDE_TORNADO
        assert settings.ZILENCER_ENABLED

        self.uuid = str(remote_server.uuid)
        self.domain = domain
        super().__init__()

    def key(self) -> str:
        return f"{type(self).__name__}:<{self.uuid}>:{self.domain}"

    def rules(self) -> List[Tuple[int, int]]:
        return rate_limiter_rules[self.domain]
