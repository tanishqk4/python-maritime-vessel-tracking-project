from api.models import AuditLog

def log_action(user, action, entity_type, entity_id, description):
    AuditLog.objects.create(
        user=user,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description
    )
