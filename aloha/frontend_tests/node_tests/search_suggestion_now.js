"use strict";

const {strict: assert} = require("assert");

const {mock_esm, zrequire} = require("../zjsunit/namespace");
const {run_test} = require("../zjsunit/test");
const {page_params} = require("../zjsunit/zpage_params");

const narrow_state = mock_esm("../../static/js/narrow_state");
const stream_topic_history_util = mock_esm("../../static/js/stream_topic_history_util");

const settings_config = zrequire("settings_config");

const huddle_data = zrequire("huddle_data");

const stream_data = zrequire("stream_data");
const stream_topic_history = zrequire("stream_topic_history");
const people = zrequire("people");
const search = zrequire("search_suggestion");

search.__Rewire__("max_num_of_search_results", 15);

const me = {
    email: "myself@aloha.com",
    full_name: "Me Myself",
    user_id: 41,
};

const bob = {
    email: "bob@aloha.com",
    full_name: "Bob Roberts",
    user_id: 42,
};

const ted = {
    email: "ted@aloha.com",
    user_id: 101,
    full_name: "Ted Smith",
};

const alice = {
    email: "alice@aloha.com",
    user_id: 102,
    full_name: "Alice Ignore",
};

const jeff = {
    email: "jeff@aloha.com",
    user_id: 103,
    full_name: "Jeff Zoolipson",
};

const example_avatar_url = "http://example.com/example.png";

function init() {
    page_params.is_admin = true;
    page_params.search_pills_enabled = false;
    page_params.realm_email_address_visibility =
        settings_config.email_address_visibility_values.admins_only.code;

    people.init();
    people.add_active_user(bob);
    people.add_active_user(me);
    people.add_active_user(ted);
    people.add_active_user(alice);
    people.add_active_user(jeff);

    people.initialize_current_user(me.user_id);

    stream_topic_history.reset();
    huddle_data.clear_for_testing();
    stream_data.clear_subscriptions();
}

function get_suggestions(base_query, query) {
    return search.get_suggestions(base_query, query);
}

function test(label, f) {
    run_test(label, (helpers) => {
        init();
        f(helpers);
    });
}

test("basic_get_suggestions", ({override}) => {
    const query = "fred";

    override(narrow_state, "stream", () => "office");

    const suggestions = get_suggestions("", query);

    const expected = ["fred"];
    assert.deepEqual(suggestions.strings, expected);
});

test("basic_get_suggestions_for_spectator", () => {
    page_params.is_spectator = true;

    const query = "";
    const suggestions = get_suggestions("", query);
    assert.deepEqual(suggestions.strings, ["", "has:link", "has:image", "has:attachment"]);
    page_params.is_spectator = false;
});

test("subset_suggestions", () => {
    const query = "stream:Denmark topic:Hamlet shakespeare";

    const suggestions = get_suggestions("", query);

    const expected = [
        "stream:Denmark topic:Hamlet shakespeare",
        "stream:Denmark topic:Hamlet",
        "stream:Denmark",
    ];

    assert.deepEqual(suggestions.strings, expected);
});

test("private_suggestions", () => {
    let query = "is:private";
    let suggestions = get_suggestions("", query);
    let expected = [
        "is:private",
        "pm-with:alice@aloha.com",
        "pm-with:bob@aloha.com",
        "pm-with:jeff@aloha.com",
        "pm-with:myself@aloha.com",
        "pm-with:ted@aloha.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = "is:private al";
    suggestions = get_suggestions("", query);
    expected = [
        "is:private al",
        "is:private is:alerted",
        "is:private sender:alice@aloha.com",
        "is:private pm-with:alice@aloha.com",
        "is:private group-pm-with:alice@aloha.com",
        "is:private",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = "pm-with:t";
    suggestions = get_suggestions("", query);
    expected = ["pm-with:t", "pm-with:ted@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);

    query = "-pm-with:t";
    suggestions = get_suggestions("", query);
    expected = ["-pm-with:t", "is:private -pm-with:ted@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);

    query = "pm-with:ted@aloha.com";
    suggestions = get_suggestions("", query);
    expected = ["pm-with:ted@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);

    query = "sender:ted";
    suggestions = get_suggestions("", query);
    expected = ["sender:ted", "sender:ted@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);

    query = "sender:te";
    suggestions = get_suggestions("", query);
    expected = ["sender:te", "sender:ted@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);

    query = "-sender:te";
    suggestions = get_suggestions("", query);
    expected = ["-sender:te", "-sender:ted@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);

    query = "sender:ted@aloha.com";
    suggestions = get_suggestions("", query);
    expected = ["sender:ted@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);

    query = "is:unread from:ted";
    suggestions = get_suggestions("", query);
    expected = ["is:unread from:ted", "is:unread from:ted@aloha.com", "is:unread"];
    assert.deepEqual(suggestions.strings, expected);

    // Users can enter bizarre queries, and if they do, we want to
    // be conservative with suggestions.
    query = "is:private near:3";
    suggestions = get_suggestions("", query);
    expected = ["is:private near:3", "is:private"];
    assert.deepEqual(suggestions.strings, expected);

    query = "pm-with:ted@aloha.com near:3";
    suggestions = get_suggestions("", query);
    expected = ["pm-with:ted@aloha.com near:3", "pm-with:ted@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);

    // Make sure suggestions still work if preceding tokens
    query = "is:alerted sender:ted@aloha.com";
    suggestions = get_suggestions("", query);
    expected = ["is:alerted sender:ted@aloha.com", "is:alerted"];
    assert.deepEqual(suggestions.strings, expected);

    query = "is:starred has:link is:private al";
    suggestions = get_suggestions("", query);
    expected = [
        "is:starred has:link is:private al",
        "is:starred has:link is:private is:alerted",
        "is:starred has:link is:private sender:alice@aloha.com",
        "is:starred has:link is:private pm-with:alice@aloha.com",
        "is:starred has:link is:private group-pm-with:alice@aloha.com",
        "is:starred has:link is:private",
        "is:starred has:link",
        "is:starred",
    ];
    assert.deepEqual(suggestions.strings, expected);

    // Make sure it handles past context correctly
    query = "stream:Denmark pm-with:";
    suggestions = get_suggestions("", query);
    expected = ["stream:Denmark pm-with:", "stream:Denmark"];
    assert.deepEqual(suggestions.strings, expected);

    query = "sender:ted@aloha.com sender:";
    suggestions = get_suggestions("", query);
    expected = ["sender:ted@aloha.com sender:", "sender:ted@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);
});

test("group_suggestions", () => {
    // Entering a comma in a pm-with query should immediately generate
    // suggestions for the next person.
    let query = "pm-with:bob@aloha.com,";
    let suggestions = get_suggestions("", query);
    let expected = [
        "pm-with:bob@aloha.com,",
        "pm-with:bob@aloha.com,alice@aloha.com",
        "pm-with:bob@aloha.com,jeff@aloha.com",
        "pm-with:bob@aloha.com,ted@aloha.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    // Only the last part of a comma-separated pm-with query should be used to
    // generate suggestions.
    query = "pm-with:bob@aloha.com,t";
    suggestions = get_suggestions("", query);
    expected = ["pm-with:bob@aloha.com,t", "pm-with:bob@aloha.com,ted@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);

    // Smit should also generate ted@aloha.com (Ted Smith) as a suggestion.
    query = "pm-with:bob@aloha.com,Smit";
    suggestions = get_suggestions("", query);
    expected = ["pm-with:bob@aloha.com,Smit", "pm-with:bob@aloha.com,ted@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);

    // Do not suggest "myself@aloha.com" (the name of the current user)
    query = "pm-with:ted@aloha.com,my";
    suggestions = get_suggestions("", query);
    expected = ["pm-with:ted@aloha.com,my"];
    assert.deepEqual(suggestions.strings, expected);

    // No superfluous suggestions should be generated.
    query = "pm-with:bob@aloha.com,red";
    suggestions = get_suggestions("", query);
    expected = ["pm-with:bob@aloha.com,red"];
    assert.deepEqual(suggestions.strings, expected);

    // is:private should be properly prepended to each suggestion if the pm-with
    // operator is negated.

    query = "-pm-with:bob@aloha.com,";
    suggestions = get_suggestions("", query);
    expected = [
        "-pm-with:bob@aloha.com,",
        "is:private -pm-with:bob@aloha.com,alice@aloha.com",
        "is:private -pm-with:bob@aloha.com,jeff@aloha.com",
        "is:private -pm-with:bob@aloha.com,ted@aloha.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = "-pm-with:bob@aloha.com,t";
    suggestions = get_suggestions("", query);
    expected = ["-pm-with:bob@aloha.com,t", "is:private -pm-with:bob@aloha.com,ted@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);

    query = "-pm-with:bob@aloha.com,Smit";
    suggestions = get_suggestions("", query);
    expected = ["-pm-with:bob@aloha.com,Smit", "is:private -pm-with:bob@aloha.com,ted@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);

    query = "-pm-with:bob@aloha.com,red";
    suggestions = get_suggestions("", query);
    expected = ["-pm-with:bob@aloha.com,red"];
    assert.deepEqual(suggestions.strings, expected);

    // Test multiple operators
    query = "is:starred has:link pm-with:bob@aloha.com,Smit";
    suggestions = get_suggestions("", query);
    expected = [
        "is:starred has:link pm-with:bob@aloha.com,Smit",
        "is:starred has:link pm-with:bob@aloha.com,ted@aloha.com",
        "is:starred has:link",
        "is:starred",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = "stream:Denmark has:link pm-with:bob@aloha.com,Smit";
    suggestions = get_suggestions("", query);
    expected = [
        "stream:Denmark has:link pm-with:bob@aloha.com,Smit",
        "stream:Denmark has:link",
        "stream:Denmark",
    ];
    assert.deepEqual(suggestions.strings, expected);

    function message(user_ids, timestamp) {
        return {
            type: "private",
            display_recipient: user_ids.map((id) => ({
                id,
            })),
            timestamp,
        };
    }

    huddle_data.process_loaded_messages([
        message([bob.user_id, ted.user_id], 99),
        message([bob.user_id, ted.user_id, jeff.user_id], 98),
    ]);

    // Simulate a past huddle which should now prioritize ted over alice
    query = "pm-with:bob@aloha.com,";
    suggestions = get_suggestions("", query);
    expected = [
        "pm-with:bob@aloha.com,",
        "pm-with:bob@aloha.com,ted@aloha.com",
        "pm-with:bob@aloha.com,alice@aloha.com",
        "pm-with:bob@aloha.com,jeff@aloha.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    // bob,ted,jeff is already an existing huddle, so prioritize this one
    query = "pm-with:bob@aloha.com,ted@aloha.com,";
    suggestions = get_suggestions("", query);
    expected = [
        "pm-with:bob@aloha.com,ted@aloha.com,",
        "pm-with:bob@aloha.com,ted@aloha.com,jeff@aloha.com",
        "pm-with:bob@aloha.com,ted@aloha.com,alice@aloha.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    // bob,ted,jeff is already an existing huddle, but if we start with just jeff,
    // then don't prioritize ted over alice because it doesn't complete the full huddle.
    query = "pm-with:jeff@aloha.com,";
    suggestions = get_suggestions("", query);
    expected = [
        "pm-with:jeff@aloha.com,",
        "pm-with:jeff@aloha.com,alice@aloha.com",
        "pm-with:jeff@aloha.com,bob@aloha.com",
        "pm-with:jeff@aloha.com,ted@aloha.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = "pm-with:jeff@aloha.com,ted@aloha.com hi";
    suggestions = get_suggestions("", query);
    expected = ["pm-with:jeff@aloha.com,ted@aloha.com hi", "pm-with:jeff@aloha.com,ted@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);
});

test("empty_query_suggestions", () => {
    const query = "";

    stream_data.add_sub({stream_id: 44, name: "devel", subscribed: true});
    stream_data.add_sub({stream_id: 77, name: "office", subscribed: true});

    const suggestions = get_suggestions("", query);

    const expected = [
        "",
        "streams:public",
        "is:private",
        "is:starred",
        "is:mentioned",
        "is:alerted",
        "is:unread",
        "is:resolved",
        "sender:myself@aloha.com",
        "stream:devel",
        "stream:office",
        "has:link",
        "has:image",
        "has:attachment",
    ];

    assert.deepEqual(suggestions.strings, expected);

    function describe(q) {
        return suggestions.lookup_table.get(q).description_html;
    }
    assert.equal(describe("is:private"), "Private messages");
    assert.equal(describe("is:starred"), "Starred messages");
    assert.equal(describe("is:mentioned"), "@-mentions");
    assert.equal(describe("is:alerted"), "Alerted messages");
    assert.equal(describe("is:unread"), "Unread messages");
    assert.equal(describe("is:resolved"), "Topics marked as resolved");
    assert.equal(describe("sender:myself@aloha.com"), "Sent by me");
    assert.equal(describe("has:link"), "Messages with one or more link");
    assert.equal(describe("has:image"), "Messages with one or more image");
    assert.equal(describe("has:attachment"), "Messages with one or more attachment");
});

test("has_suggestions", ({override}) => {
    // Checks that category wise suggestions are displayed instead of a single
    // default suggestion when suggesting `has` operator.
    let query = "h";
    stream_data.add_sub({stream_id: 44, name: "devel", subscribed: true});
    stream_data.add_sub({stream_id: 77, name: "office", subscribed: true});
    override(narrow_state, "stream", () => {});

    let suggestions = get_suggestions("", query);
    let expected = ["h", "has:link", "has:image", "has:attachment"];
    assert.deepEqual(suggestions.strings, expected);

    function describe(q) {
        return suggestions.lookup_table.get(q).description_html;
    }

    assert.equal(describe("has:link"), "Messages with one or more link");
    assert.equal(describe("has:image"), "Messages with one or more image");
    assert.equal(describe("has:attachment"), "Messages with one or more attachment");

    query = "-h";
    suggestions = get_suggestions("", query);
    expected = ["-h", "-has:link", "-has:image", "-has:attachment"];
    assert.deepEqual(suggestions.strings, expected);
    assert.equal(describe("-has:link"), "Exclude messages with one or more link");
    assert.equal(describe("-has:image"), "Exclude messages with one or more image");
    assert.equal(describe("-has:attachment"), "Exclude messages with one or more attachment");

    // operand suggestions follow.

    query = "has:";
    suggestions = get_suggestions("", query);
    expected = ["has:link", "has:image", "has:attachment"];
    assert.deepEqual(suggestions.strings, expected);

    query = "has:im";
    suggestions = get_suggestions("", query);
    expected = ["has:image"];
    assert.deepEqual(suggestions.strings, expected);

    query = "-has:im";
    suggestions = get_suggestions("", query);
    expected = ["-has:image"];
    assert.deepEqual(suggestions.strings, expected);

    query = "att";
    suggestions = get_suggestions("", query);
    expected = ["att", "has:attachment"];
    assert.deepEqual(suggestions.strings, expected);

    query = "stream:Denmark is:alerted has:lin";
    suggestions = get_suggestions("", query);
    expected = [
        "stream:Denmark is:alerted has:link",
        "stream:Denmark is:alerted",
        "stream:Denmark",
    ];
    assert.deepEqual(suggestions.strings, expected);
});

test("check_is_suggestions", ({override}) => {
    stream_data.add_sub({stream_id: 44, name: "devel", subscribed: true});
    stream_data.add_sub({stream_id: 77, name: "office", subscribed: true});
    override(narrow_state, "stream", () => {});

    let query = "i";
    let suggestions = get_suggestions("", query);
    let expected = [
        "i",
        "is:private",
        "is:starred",
        "is:mentioned",
        "is:alerted",
        "is:unread",
        "is:resolved",
        "sender:alice@aloha.com",
        "pm-with:alice@aloha.com",
        "group-pm-with:alice@aloha.com",
        "has:image",
    ];
    assert.deepEqual(suggestions.strings, expected);

    function describe(q) {
        return suggestions.lookup_table.get(q).description_html;
    }

    assert.equal(describe("is:private"), "Private messages");
    assert.equal(describe("is:starred"), "Starred messages");
    assert.equal(describe("is:mentioned"), "@-mentions");
    assert.equal(describe("is:alerted"), "Alerted messages");
    assert.equal(describe("is:unread"), "Unread messages");
    assert.equal(describe("is:resolved"), "Topics marked as resolved");

    query = "-i";
    suggestions = get_suggestions("", query);
    expected = [
        "-i",
        "-is:private",
        "-is:starred",
        "-is:mentioned",
        "-is:alerted",
        "-is:unread",
        "-is:resolved",
    ];
    assert.deepEqual(suggestions.strings, expected);

    assert.equal(describe("-is:private"), "Exclude private messages");
    assert.equal(describe("-is:starred"), "Exclude starred messages");
    assert.equal(describe("-is:mentioned"), "Exclude @-mentions");
    assert.equal(describe("-is:alerted"), "Exclude alerted messages");
    assert.equal(describe("-is:unread"), "Exclude unread messages");
    assert.equal(describe("-is:resolved"), "Exclude topics marked as resolved");

    // operand suggestions follow.

    query = "is:";
    suggestions = get_suggestions("", query);
    expected = [
        "is:private",
        "is:starred",
        "is:mentioned",
        "is:alerted",
        "is:unread",
        "is:resolved",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = "is:st";
    suggestions = get_suggestions("", query);
    expected = ["is:starred"];
    assert.deepEqual(suggestions.strings, expected);

    query = "-is:st";
    suggestions = get_suggestions("", query);
    expected = ["-is:starred"];
    assert.deepEqual(suggestions.strings, expected);

    query = "st";
    suggestions = get_suggestions("", query);
    expected = ["st", "streams:public", "is:starred", "stream:"];
    assert.deepEqual(suggestions.strings, expected);

    query = "stream:Denmark has:link is:sta";
    suggestions = get_suggestions("", query);
    expected = ["stream:Denmark has:link is:starred", "stream:Denmark has:link", "stream:Denmark"];
    assert.deepEqual(suggestions.strings, expected);
});

test("sent_by_me_suggestions", ({override}) => {
    override(narrow_state, "stream", () => {});

    let query = "";
    let suggestions = get_suggestions("", query);
    assert.ok(suggestions.strings.includes("sender:myself@aloha.com"));
    assert.equal(
        suggestions.lookup_table.get("sender:myself@aloha.com").description_html,
        "Sent by me",
    );

    query = "sender";
    suggestions = get_suggestions("", query);
    let expected = ["sender", "sender:myself@aloha.com", "sender:"];
    assert.deepEqual(suggestions.strings, expected);

    query = "-sender";
    suggestions = get_suggestions("", query);
    expected = ["-sender", "-sender:myself@aloha.com", "-sender:"];
    assert.deepEqual(suggestions.strings, expected);

    query = "from";
    suggestions = get_suggestions("", query);
    expected = ["from", "from:myself@aloha.com", "from:"];
    assert.deepEqual(suggestions.strings, expected);

    query = "-from";
    suggestions = get_suggestions("", query);
    expected = ["-from", "-from:myself@aloha.com", "-from:"];
    assert.deepEqual(suggestions.strings, expected);

    query = "sender:bob@aloha.com";
    suggestions = get_suggestions("", query);
    expected = ["sender:bob@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);

    query = "from:bob@aloha.com";
    suggestions = get_suggestions("", query);
    expected = ["from:bob@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);

    query = "sent";
    suggestions = get_suggestions("", query);
    expected = ["sent", "sender:myself@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);

    query = "-sent";
    suggestions = get_suggestions("", query);
    expected = ["-sent", "-sender:myself@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);

    query = "stream:Denmark topic:Denmark1 sent";
    suggestions = get_suggestions("", query);
    expected = [
        "stream:Denmark topic:Denmark1 sent",
        "stream:Denmark topic:Denmark1 sender:myself@aloha.com",
        "stream:Denmark topic:Denmark1",
        "stream:Denmark",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = "is:starred sender:m";
    suggestions = get_suggestions("", query);
    expected = ["is:starred sender:m", "is:starred sender:myself@aloha.com", "is:starred"];
    assert.deepEqual(suggestions.strings, expected);

    query = "sender:alice@aloha.com sender:";
    suggestions = get_suggestions("", query);
    expected = ["sender:alice@aloha.com sender:", "sender:alice@aloha.com"];
    assert.deepEqual(suggestions.strings, expected);
});

test("topic_suggestions", ({override}) => {
    let suggestions;
    let expected;

    override(stream_topic_history_util, "get_server_history", () => {});
    stream_data.add_sub({stream_id: 77, name: "office", subscribed: true});
    override(narrow_state, "stream", () => "office");

    const devel_id = 44;
    const office_id = 77;
    stream_data.add_sub({stream_id: devel_id, name: "devel", subscribed: true});
    stream_data.add_sub({stream_id: office_id, name: "office", subscribed: true});

    suggestions = get_suggestions("", "te");
    expected = [
        "te",
        "sender:ted@aloha.com",
        "pm-with:ted@aloha.com",
        "group-pm-with:ted@aloha.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    stream_topic_history.add_message({
        stream_id: devel_id,
        topic_name: "REXX",
    });

    for (const topic_name of ["team", "ignore", "test"]) {
        stream_topic_history.add_message({
            stream_id: office_id,
            topic_name,
        });
    }

    suggestions = get_suggestions("", "te");
    expected = [
        "te",
        "sender:ted@aloha.com",
        "pm-with:ted@aloha.com",
        "group-pm-with:ted@aloha.com",
        "stream:office topic:team",
        "stream:office topic:test",
    ];
    assert.deepEqual(suggestions.strings, expected);

    function describe(q) {
        return suggestions.lookup_table.get(q).description_html;
    }
    assert.equal(describe("te"), "Search for te");
    assert.equal(describe("stream:office topic:team"), "Stream office &gt; team");

    suggestions = get_suggestions("", "topic:staplers stream:office");
    expected = ["topic:staplers stream:office", "topic:staplers"];
    assert.deepEqual(suggestions.strings, expected);

    suggestions = get_suggestions("", "stream:devel topic:");
    expected = ["stream:devel topic:", "stream:devel topic:REXX", "stream:devel"];
    assert.deepEqual(suggestions.strings, expected);

    suggestions = get_suggestions("", "stream:devel -topic:");
    expected = ["stream:devel -topic:", "stream:devel -topic:REXX", "stream:devel"];
    assert.deepEqual(suggestions.strings, expected);

    suggestions = get_suggestions("", "-topic:te");
    expected = ["-topic:te", "stream:office -topic:team", "stream:office -topic:test"];
    assert.deepEqual(suggestions.strings, expected);

    suggestions = get_suggestions("", "is:alerted stream:devel is:starred topic:");
    expected = [
        "is:alerted stream:devel is:starred topic:",
        "is:alerted stream:devel is:starred topic:REXX",
        "is:alerted stream:devel is:starred",
        "is:alerted stream:devel",
        "is:alerted",
    ];
    assert.deepEqual(suggestions.strings, expected);

    suggestions = get_suggestions("", "is:private stream:devel topic:");
    expected = ["is:private stream:devel topic:", "is:private stream:devel", "is:private"];
    assert.deepEqual(suggestions.strings, expected);

    suggestions = get_suggestions("", "topic:REXX stream:devel topic:");
    expected = ["topic:REXX stream:devel topic:", "topic:REXX stream:devel", "topic:REXX"];
    assert.deepEqual(suggestions.strings, expected);
});

test("topic_suggestions (limits)", () => {
    let candidate_topics = [];

    function assert_result(guess, expected_topics) {
        assert.deepEqual(
            search.get_topic_suggestions_from_candidates({candidate_topics, guess}),
            expected_topics,
        );
    }

    assert_result("", []);
    assert_result("zzz", []);

    candidate_topics = ["a", "b", "c"];
    assert_result("", ["a", "b", "c"]);
    assert_result("b", ["b"]);
    assert_result("z", []);

    candidate_topics = [
        "a1",
        "a2",
        "b1",
        "b2",
        "a3",
        "a4",
        "a5",
        "c1",
        "a6",
        "a7",
        "a8",
        "c2",
        "a9",
        "a10",
        "a11",
        "a12",
    ];
    // We max out at 10 topics, so as not to overwhelm the user.
    assert_result("", ["a1", "a2", "b1", "b2", "a3", "a4", "a5", "c1", "a6", "a7"]);
    assert_result("a", ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "a10"]);
    assert_result("b", ["b1", "b2"]);
    assert_result("z", []);
});

test("whitespace_glitch", ({override}) => {
    const query = "stream:office "; // note trailing space

    override(stream_topic_history_util, "get_server_history", () => {});
    stream_data.add_sub({stream_id: 77, name: "office", subscribed: true});

    const suggestions = get_suggestions("", query);

    const expected = ["stream:office"];

    assert.deepEqual(suggestions.strings, expected);
});

test("stream_completion", ({override}) => {
    stream_data.add_sub({stream_id: 77, name: "office", subscribed: true});
    stream_data.add_sub({stream_id: 88, name: "dev help", subscribed: true});

    override(narrow_state, "stream", () => {});

    let query = "stream:of";
    let suggestions = get_suggestions("", query);
    let expected = ["stream:of", "stream:office"];
    assert.deepEqual(suggestions.strings, expected);

    query = "-stream:of";
    suggestions = get_suggestions("", query);
    expected = ["-stream:of", "-stream:office"];
    assert.deepEqual(suggestions.strings, expected);

    query = "hel";
    suggestions = get_suggestions("", query);
    expected = ["hel", "stream:dev+help"];
    assert.deepEqual(suggestions.strings, expected);
});

test("people_suggestions", ({override}) => {
    let query = "te";

    override(narrow_state, "stream", () => {});

    const ted = {
        email: "ted@aloha.com",
        user_id: 201,
        full_name: "Ted Smith",
    };

    const bob = {
        email: "bob@aloha.com",
        user_id: 202,
        full_name: "Bob Térry",
        avatar_url: example_avatar_url,
    };

    const alice = {
        email: "alice@aloha.com",
        user_id: 203,
        full_name: "Alice Ignore",
    };
    people.add_active_user(ted);
    people.add_active_user(bob);
    people.add_active_user(alice);

    let suggestions = get_suggestions("", query);

    let expected = [
        "te",
        "sender:bob@aloha.com",
        "sender:ted@aloha.com",
        "pm-with:bob@aloha.com", // bob térry
        "pm-with:ted@aloha.com",
        "group-pm-with:bob@aloha.com",
        "group-pm-with:ted@aloha.com",
    ];

    assert.deepEqual(suggestions.strings, expected);

    function is_person(q) {
        return suggestions.lookup_table.get(q).is_person;
    }
    assert.equal(is_person("pm-with:ted@aloha.com"), true);
    assert.equal(is_person("sender:ted@aloha.com"), true);
    assert.equal(is_person("group-pm-with:ted@aloha.com"), true);

    function has_image(q) {
        return suggestions.lookup_table.get(q).user_pill_context.has_image;
    }
    assert.equal(has_image("pm-with:bob@aloha.com"), true);
    assert.equal(has_image("sender:bob@aloha.com"), true);
    assert.equal(has_image("group-pm-with:bob@aloha.com"), true);

    function describe(q) {
        return suggestions.lookup_table.get(q).description_html;
    }
    assert.equal(describe("pm-with:ted@aloha.com"), "Private messages with");
    assert.equal(describe("sender:ted@aloha.com"), "Sent by");
    assert.equal(describe("group-pm-with:ted@aloha.com"), "Group private messages including");

    let expectedString = "<strong>Te</strong>d Smith";

    function get_full_name(q) {
        return suggestions.lookup_table.get(q).user_pill_context.display_value.string;
    }
    assert.equal(get_full_name("sender:ted@aloha.com"), expectedString);
    assert.equal(get_full_name("pm-with:ted@aloha.com"), expectedString);
    assert.equal(get_full_name("group-pm-with:ted@aloha.com"), expectedString);

    expectedString = example_avatar_url + "?s=50";

    function get_avatar_url(q) {
        return suggestions.lookup_table.get(q).user_pill_context.img_src;
    }
    assert.equal(get_avatar_url("pm-with:bob@aloha.com"), expectedString);
    assert.equal(get_avatar_url("sender:bob@aloha.com"), expectedString);
    assert.equal(get_avatar_url("group-pm-with:bob@aloha.com"), expectedString);

    suggestions = get_suggestions("", "Ted "); // note space

    expected = [
        "Ted",
        "sender:ted@aloha.com",
        "pm-with:ted@aloha.com",
        "group-pm-with:ted@aloha.com",
    ];

    assert.deepEqual(suggestions.strings, expected);

    query = "sender:ted sm";
    expected = ["sender:ted+sm", "sender:ted@aloha.com"];
    suggestions = get_suggestions("", query);
    assert.deepEqual(suggestions.strings, expected);

    query = "sender:ted@aloha.com new";
    expected = ["sender:ted@aloha.com new", "sender:ted@aloha.com"];
    suggestions = get_suggestions("", query);
    assert.deepEqual(suggestions.strings, expected);

    query = "sender:ted@tulip.com new";
    expected = ["sender:ted@tulip.com+new"];
    suggestions = get_suggestions("", query);
    assert.deepEqual(suggestions.strings, expected);
});

test("operator_suggestions", ({override}) => {
    override(narrow_state, "stream", () => undefined);

    // Completed operator should return nothing
    let query = "stream:";
    let suggestions = get_suggestions("", query);
    let expected = ["stream:"];
    assert.deepEqual(suggestions.strings, expected);

    query = "st";
    suggestions = get_suggestions("", query);
    expected = ["st", "streams:public", "is:starred", "stream:"];
    assert.deepEqual(suggestions.strings, expected);

    query = "group-";
    suggestions = get_suggestions("", query);
    expected = ["group-", "group-pm-with:"];
    assert.deepEqual(suggestions.strings, expected);

    query = "-s";
    suggestions = get_suggestions("", query);
    expected = ["-s", "-streams:public", "-sender:myself@aloha.com", "-stream:", "-sender:"];
    assert.deepEqual(suggestions.strings, expected);

    query = "stream:Denmark is:alerted -f";
    suggestions = get_suggestions("", query);
    expected = [
        "stream:Denmark is:alerted -f",
        "stream:Denmark is:alerted -from:myself@aloha.com",
        "stream:Denmark is:alerted -from:",
        "stream:Denmark is:alerted",
        "stream:Denmark",
    ];
    assert.deepEqual(suggestions.strings, expected);
});

test("queries_with_spaces", () => {
    stream_data.add_sub({stream_id: 77, name: "office", subscribed: true});
    stream_data.add_sub({stream_id: 88, name: "dev help", subscribed: true});

    // test allowing spaces with quotes surrounding operand
    let query = 'stream:"dev he"';
    let suggestions = get_suggestions("", query);
    let expected = ["stream:dev+he", "stream:dev+help"];
    assert.deepEqual(suggestions.strings, expected);

    // test mismatched quote
    query = 'stream:"dev h';
    suggestions = get_suggestions("", query);
    expected = ["stream:dev+h", "stream:dev+help"];
    assert.deepEqual(suggestions.strings, expected);

    // test extra space after operator still works
    query = "stream: offi";
    suggestions = get_suggestions("", query);
    expected = ["stream:offi", "stream:office"];
    assert.deepEqual(suggestions.strings, expected);
});
