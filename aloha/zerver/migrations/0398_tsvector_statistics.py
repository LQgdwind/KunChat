# Generated by Django 4.0.6 on 2022-07-18 23:22

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("zerver", "0397_remove_custom_field_values_for_deleted_options"),
    ]

    operations = [
        # The "most common values" list for a tsvector is 10x this
        # number, which defaults to 100.  Increasing it allows for
        # better query planning, at a small cost of size, and
        # `ANALYZE` time.  It only takes effect after the next
        # `ANALYZE`, which we run immediately.
        migrations.RunSQL(
            sql="ALTER TABLE zerver_message ALTER COLUMN search_tsvector SET STATISTICS 10000",
            reverse_sql="ALTER TABLE zerver_message ALTER COLUMNS search_tsvector SET STATISTICS -1",
        ),
        migrations.RunSQL(
            sql="ANALYZE zerver_message",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
