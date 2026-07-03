// Oasis - A simple Todo List app built with Tauri, SolidJS and Rust.
// Copyright (C) 2026 Uno
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use serde::{Deserialize, Serialize};
use specta::Type;

use crate::store::Tag;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[allow(dead_code)]
pub struct InputToken {
    pub kind: String,
    pub text: String,
    pub start: u32,
    pub end: u32,
    pub query: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MentionToken {
    pub start: u32,
    pub end: u32,
    pub query: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TagSuggestion {
    pub kind: String,
    pub name: String,
    pub tag: Option<Tag>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TagInputAnalysis {
    pub active_mention: Option<MentionToken>,
    pub suggestions: Vec<TagSuggestion>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TagSuggestionAction {
    pub kind: String,
    pub name: String,
    pub tag_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ApplyTagSuggestionResult {
    pub value: String,
    pub tag_ids: Vec<String>,
    pub caret: u32,
    pub app_state: crate::store::AppState,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedContentTags {
    pub content: String,
    pub tag_names: Vec<String>,
}

#[derive(Debug, Clone)]
struct ByteMentionToken {
    start: usize,
    end: usize,
    query: String,
}

#[allow(dead_code)]
pub fn tokenize_input(value: &str) -> Vec<InputToken> {
    let mentions = tokenize_mentions(value);
    let mut tokens = Vec::new();
    let mut cursor = 0;

    for mention in mentions {
        if cursor < mention.start {
            tokens.push(InputToken {
                kind: "text".to_string(),
                text: value[cursor..mention.start].to_string(),
                start: byte_to_utf16(value, cursor),
                end: byte_to_utf16(value, mention.start),
                query: None,
            });
        }

        tokens.push(InputToken {
            kind: "mention".to_string(),
            text: value[mention.start..mention.end].to_string(),
            start: byte_to_utf16(value, mention.start),
            end: byte_to_utf16(value, mention.end),
            query: Some(mention.query),
        });

        cursor = mention.end;
    }

    if cursor < value.len() {
        tokens.push(InputToken {
            kind: "text".to_string(),
            text: value[cursor..].to_string(),
            start: byte_to_utf16(value, cursor),
            end: byte_to_utf16(value, value.len()),
            query: None,
        });
    }

    tokens
}

pub fn get_active_mention(value: &str, caret: u32) -> Option<MentionToken> {
    let caret_byte = utf16_to_byte(value, caret as usize);

    tokenize_mentions(value)
        .into_iter()
        .find(|mention| mention.start < caret_byte && caret_byte <= mention.end)
        .map(|mention| MentionToken {
            start: byte_to_utf16(value, mention.start),
            end: byte_to_utf16(value, mention.end),
            query: mention.query,
        })
}

pub fn build_tag_input_analysis(
    value: &str,
    caret: u32,
    selected_tag_ids: &[String],
    tags: &[Tag],
) -> TagInputAnalysis {
    let active_mention = get_active_mention(value, caret);
    let Some(mention) = active_mention.clone() else {
        return TagInputAnalysis {
            active_mention: None,
            suggestions: vec![],
        };
    };

    let query = mention.query.to_lowercase();
    let mut suggestions: Vec<TagSuggestion> = tags
        .iter()
        .filter(|tag| !selected_tag_ids.iter().any(|id| id == &tag.id))
        .filter(|tag| tag.name.to_lowercase().contains(&query))
        .take(6)
        .cloned()
        .map(|tag| TagSuggestion {
            kind: "existing".to_string(),
            name: tag.name.clone(),
            tag: Some(tag),
        })
        .collect();

    if suggestions.is_empty() && !mention.query.trim().is_empty() {
        suggestions.push(TagSuggestion {
            kind: "create".to_string(),
            name: mention.query.trim().to_string(),
            tag: None,
        });
    }

    TagInputAnalysis {
        active_mention: Some(mention),
        suggestions,
    }
}

pub fn remove_mention_from_value(value: &str, start: u32, end: u32) -> (String, u32) {
    let start_byte = utf16_to_byte(value, start as usize);
    let end_byte = utf16_to_byte(value, end as usize);
    let mut next = String::with_capacity(value.len().saturating_sub(end_byte - start_byte));
    next.push_str(&value[..start_byte]);
    next.push_str(&value[end_byte..]);

    let collapsed = collapse_spaces(&next);
    let caret = byte_to_utf16(&collapsed, utf16_to_byte(&collapsed, start as usize));
    (collapsed.trim_start().to_string(), caret)
}

pub fn parse_content_tags(value: &str) -> ParsedContentTags {
    let mut content_parts = Vec::new();
    let mut tag_names = Vec::new();

    for part in value.split_whitespace() {
        if let Some(name) = part.strip_prefix('@') {
            let trimmed = name.trim();
            if !trimmed.is_empty() && !tag_names.iter().any(|tag| tag == trimmed) {
                tag_names.push(trimmed.to_string());
            }
        } else {
            content_parts.push(part);
        }
    }

    ParsedContentTags {
        content: content_parts.join(" "),
        tag_names,
    }
}

fn tokenize_mentions(value: &str) -> Vec<ByteMentionToken> {
    let mut mentions = Vec::new();
    let mut index = 0;

    while index < value.len() {
        let Some((offset, ch)) = value[index..].char_indices().next() else {
            break;
        };
        let byte_index = index + offset;
        if ch != '@' || !is_mention_start(value, byte_index) {
            index = byte_index + ch.len_utf8();
            continue;
        }

        let query_start = byte_index + ch.len_utf8();
        let mut end = query_start;
        for (query_offset, query_ch) in value[query_start..].char_indices() {
            if query_ch.is_whitespace() || query_ch == '@' {
                break;
            }
            end = query_start + query_offset + query_ch.len_utf8();
        }

        mentions.push(ByteMentionToken {
            start: byte_index,
            end,
            query: value[query_start..end].to_string(),
        });

        index = end.max(query_start);
    }

    mentions
}

fn is_mention_start(value: &str, byte_index: usize) -> bool {
    if byte_index == 0 {
        return true;
    }

    value[..byte_index]
        .chars()
        .next_back()
        .is_some_and(char::is_whitespace)
}

fn collapse_spaces(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let mut previous_was_space = false;

    for ch in value.chars() {
        if ch == ' ' {
            if !previous_was_space {
                output.push(ch);
            }
            previous_was_space = true;
        } else {
            output.push(ch);
            previous_was_space = false;
        }
    }

    output
}

fn utf16_to_byte(value: &str, caret: usize) -> usize {
    if caret == 0 {
        return 0;
    }

    let mut utf16_count = 0;
    for (byte_index, ch) in value.char_indices() {
        if utf16_count >= caret {
            return byte_index;
        }
        utf16_count += ch.len_utf16();
        if utf16_count > caret {
            return byte_index;
        }
    }

    value.len()
}

fn byte_to_utf16(value: &str, byte: usize) -> u32 {
    to_u32(
        value[..byte.min(value.len())]
            .chars()
            .map(char::len_utf16)
            .sum(),
    )
}

fn to_u32(value: usize) -> u32 {
    value.try_into().unwrap_or(u32::MAX)
}

#[cfg(test)]
mod tests {
    use super::{
        build_tag_input_analysis, get_active_mention, parse_content_tags,
        remove_mention_from_value, tokenize_input,
    };
    use crate::store::Tag;

    fn tag(id: &str, name: &str) -> Tag {
        Tag {
            id: id.to_string(),
            name: name.to_string(),
            color: "#d97757".to_string(),
        }
    }

    #[test]
    fn tokenizes_mentions_at_start_and_after_space() {
        let tokens = tokenize_input("@work hello @home");
        assert_eq!(tokens.len(), 3);
        assert_eq!(tokens[0].kind, "mention");
        assert_eq!(tokens[0].query.as_deref(), Some("work"));
        assert_eq!(tokens[2].query.as_deref(), Some("home"));
    }

    #[test]
    fn ignores_mentions_inside_words() {
        assert!(get_active_mention("hello@work", 10).is_none());
    }

    #[test]
    fn supports_empty_query_after_at() {
        let mention = get_active_mention("@", 1).expect("active mention");
        assert_eq!(mention.query, "");
    }

    #[test]
    fn finds_second_token_at_caret() {
        let mention = get_active_mention("@a @b", 5).expect("active mention");
        assert_eq!(mention.query, "b");
    }

    #[test]
    fn returns_existing_or_create_suggestions() {
        let tags = vec![tag("tag-1", "work")];
        let existing = build_tag_input_analysis("@wo", 3, &[], &tags);
        assert_eq!(existing.suggestions[0].kind, "existing");

        let create = build_tag_input_analysis("@home", 5, &[], &tags);
        assert_eq!(create.suggestions[0].kind, "create");
        assert_eq!(create.suggestions[0].name, "home");
    }

    #[test]
    fn removes_mention_with_utf16_caret_positions() {
        let (value, caret) = remove_mention_from_value("中文 @work todo", 3, 8);
        assert_eq!(value, "中文 todo");
        assert_eq!(caret, 3);
    }

    #[test]
    fn parses_content_tags_from_space_separated_tokens() {
        let parsed = parse_content_tags("买菜 @生活 @urgent 明天");
        assert_eq!(parsed.content, "买菜 明天");
        assert_eq!(parsed.tag_names, vec!["生活", "urgent"]);
    }

    #[test]
    fn ignores_inline_at_when_parsing_content_tags() {
        let parsed = parse_content_tags("mail@work @work");
        assert_eq!(parsed.content, "mail@work");
        assert_eq!(parsed.tag_names, vec!["work"]);
    }
}
