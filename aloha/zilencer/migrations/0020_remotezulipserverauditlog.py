# Generated by Django 3.2.9 on 2021-12-06 18:35

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("zilencer", "0019_remotealohaserver_plan_type"),
    ]

    operations = [
        migrations.CreateModel(
            name="RemoteAlohaServerAuditLog",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("event_time", models.DateTimeField(db_index=True)),
                ("backfilled", models.BooleanField(default=False)),
                ("extra_data", models.TextField(null=True)),
                ("event_type", models.PositiveSmallIntegerField()),
                (
                    "server",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="zilencer.remotealohaserver"
                    ),
                ),
            ],
            options={
                "abstract": False,
            },
        ),
    ]
