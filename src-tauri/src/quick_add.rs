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

use regex::Regex;
use rosetta_date::i18n;
use rosetta_date::{parse_with_options, ParseOptions, RosettaDateTime, TzOffset};
use std::sync::LazyLock;

const LOCAL_TZ: TzOffset = TzOffset {
    total_seconds: 8 * 3600,
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct QuickAddResult {
    pub content: String,
    pub planned_date: Option<String>,
    pub due_date: Option<String>,
    pub priority: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum DateKind {
    Planned,
    Due,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Span {
    start: usize,
    end: usize,
}

#[derive(Debug, Clone)]
struct DateCandidate {
    date_text: String,
    remove_span: Span,
    kind: DateKind,
}

static CHINESE_SPECIAL_DATE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(大后天|大後天|后天|後天|明天|明日|今天|今日|昨天|昨日|前天|前日)").unwrap()
});

static CHINESE_RELATIVE_DATE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?x)(?:\d+|[零〇一二两两三四五六七八九十拾百佰千仟万萬半]+)\s*(?:天|日|周|星期|礼拜|個月|个月|月|年)\s*(?:后|後|以后|以後|之后|之後|前|以前|之前)").unwrap()
});

static CHINESE_WEEKDAY_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?:本|这|這|这个|這個|下|下个|下個|下一个|下一個|上|上个|上個|上一个|上一個)?\s*(?:周|星期|礼拜)[一二三四五六日天]").unwrap()
});

static CHINESE_ABSOLUTE_DATE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?:\d{2,4}\s*年\s*)?\d{1,2}\s*月\s*\d{1,2}\s*(?:日|号|號)?").unwrap()
});

static NUMERIC_ABSOLUTE_DATE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b|\b\d{1,2}/\d{1,2}\b").unwrap());

static ENGLISH_RELATIVE_DATE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?ix)\b(?:in\s+)?\d+\s*(?:days?|weeks?|months?|years?)\s*(?:later|from\s+now|ago)?\b",
    )
    .unwrap()
});

static ENGLISH_SPECIAL_DATE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)\b(?:today|tomorrow|tonight|yesterday)\b").unwrap());

static ENGLISH_WEEKDAY_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?ix)\b(?:(?:this|next|last)\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b").unwrap()
});

static ENGLISH_MONTH_DATE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?ix)\b(?:(?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{2,4})?|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\.?(?:\s+\d{2,4})?)\b").unwrap()
});

static CHINESE_TIME_SUFFIX_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^\s*(?:上午|下午|晚上|早上|凌晨|中午|傍晚)?\s*\d{1,2}\s*(?:(?:[:：]\s*\d{1,2})|(?:[点點]\s*\d{0,2}))?\s*(?:分)?").unwrap()
});

static ENGLISH_TIME_SUFFIX_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)^\s*(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b").unwrap());

pub fn parse_quick_add(
    value: &str,
    today: &str,
    explicit_planned_date: Option<String>,
    explicit_due_date: Option<String>,
    default_priority: u8,
) -> Result<QuickAddResult, String> {
    let today_dt = base_datetime(today).ok_or_else(|| "当前日期无效".to_string())?;
    let mut spans = Vec::new();
    let priority = extract_priority(value, default_priority, &mut spans);

    let mut planned_date = None;
    let mut due_date = None;
    for candidate in extract_date_candidates(value) {
        if overlaps_any(candidate.remove_span, &spans) {
            continue;
        }
        let Some(date) = parse_date_text(&candidate.date_text, &today_dt) else {
            continue;
        };

        match candidate.kind {
            DateKind::Planned => planned_date = Some(date),
            DateKind::Due => due_date = Some(date),
        }
        spans.push(candidate.remove_span);
    }

    let content = strip_spans(value, &spans);

    let due_date = explicit_due_date.or(due_date);
    let planned_date = if due_date.is_some() {
        None
    } else {
        explicit_planned_date.or(planned_date)
    };

    Ok(QuickAddResult {
        content,
        planned_date,
        due_date,
        priority,
    })
}

fn extract_date_candidates(value: &str) -> Vec<DateCandidate> {
    let mut candidates = Vec::new();
    collect_regex_candidates(value, &CHINESE_SPECIAL_DATE_RE, &mut candidates);
    collect_regex_candidates(value, &CHINESE_RELATIVE_DATE_RE, &mut candidates);
    collect_regex_candidates(value, &CHINESE_WEEKDAY_RE, &mut candidates);
    collect_regex_candidates(value, &CHINESE_ABSOLUTE_DATE_RE, &mut candidates);
    collect_regex_candidates(value, &NUMERIC_ABSOLUTE_DATE_RE, &mut candidates);
    collect_regex_candidates(value, &ENGLISH_RELATIVE_DATE_RE, &mut candidates);
    collect_regex_candidates(value, &ENGLISH_SPECIAL_DATE_RE, &mut candidates);
    collect_regex_candidates(value, &ENGLISH_WEEKDAY_RE, &mut candidates);
    collect_regex_candidates(value, &ENGLISH_MONTH_DATE_RE, &mut candidates);

    candidates.sort_by(|a, b| {
        a.remove_span.start.cmp(&b.remove_span.start).then_with(|| {
            (b.remove_span.end - b.remove_span.start)
                .cmp(&(a.remove_span.end - a.remove_span.start))
        })
    });

    let mut selected = Vec::new();
    let mut occupied = Vec::new();
    for candidate in candidates {
        if overlaps_any(candidate.remove_span, &occupied) {
            continue;
        }
        occupied.push(candidate.remove_span);
        selected.push(candidate);
    }
    selected
}

fn collect_regex_candidates(value: &str, regex: &Regex, candidates: &mut Vec<DateCandidate>) {
    for matched in regex.find_iter(value) {
        let date_span = Span {
            start: matched.start(),
            end: extend_time_suffix(value, matched.end()),
        };
        let (kind, remove_start) = classify_date_kind(value, date_span.start);
        let remove_span = Span {
            start: remove_start,
            end: date_span.end,
        };
        candidates.push(DateCandidate {
            date_text: value[date_span.start..date_span.end].trim().to_string(),
            remove_span,
            kind,
        });
    }
}

fn classify_date_kind(value: &str, date_start: usize) -> (DateKind, usize) {
    let prefix_end = trim_left_separators(value, date_start);
    let prefix = &value[..prefix_end];

    for marker in ["截止", "截至", "到期", "deadline", "ddl", "due", "by"] {
        if let Some(start) = marker_start(prefix, marker) {
            return (DateKind::Due, start);
        }
    }

    for marker in ["计划", "安排", "scheduled", "schedule"] {
        if let Some(start) = marker_start(prefix, marker) {
            return (DateKind::Planned, start);
        }
    }

    (DateKind::Planned, date_start)
}

fn marker_start(prefix: &str, marker: &str) -> Option<usize> {
    let lower_prefix = prefix.to_lowercase();
    let lower_marker = marker.to_lowercase();
    let marker_start = lower_prefix.rfind(&lower_marker)?;
    let between = &prefix[marker_start + marker.len()..];
    if !between.chars().all(is_separator) {
        return None;
    }
    if marker.is_ascii() {
        let before = prefix[..marker_start].chars().next_back();
        if before.is_some_and(|ch| ch.is_ascii_alphanumeric()) {
            return None;
        }
    }
    Some(marker_start)
}

fn extend_time_suffix(value: &str, end: usize) -> usize {
    let suffix = &value[end..];
    let mut best = end;
    if let Some(matched) = CHINESE_TIME_SUFFIX_RE.find(suffix) {
        let text = matched.as_str();
        if text.contains('点')
            || text.contains('點')
            || text.contains(':')
            || text.contains('：')
            || text.contains("上午")
            || text.contains("下午")
            || text.contains("晚上")
            || text.contains("早上")
            || text.contains("凌晨")
            || text.contains("中午")
            || text.contains("傍晚")
        {
            best = best.max(end + matched.end());
        }
    }
    if let Some(matched) = ENGLISH_TIME_SUFFIX_RE.find(suffix) {
        best = best.max(end + matched.end());
    }
    best
}

fn extract_priority(value: &str, default_priority: u8, spans: &mut Vec<Span>) -> u8 {
    let mut priority = default_priority;
    let bytes = value.as_bytes();
    let mut index = 0;

    while index + 1 < bytes.len() {
        let ch = bytes[index] as char;
        if matches!(ch, '!' | 'p' | 'P') && bytes[index + 1].is_ascii_digit() {
            let digit = bytes[index + 1] - b'0';
            if (1..=5).contains(&digit) && has_priority_boundaries(value, index, index + 2) {
                priority = digit;
                spans.push(Span {
                    start: index,
                    end: index + 2,
                });
                index += 2;
                continue;
            }
        }
        index += 1;
    }

    for marker in ["优先级", "優先級"] {
        let mut search_start = 0;
        while let Some(offset) = value[search_start..].find(marker) {
            let start = search_start + offset;
            let after_marker = start + marker.len();
            let Some((digit_start, digit)) = first_priority_digit(value, after_marker) else {
                search_start = after_marker;
                continue;
            };
            priority = digit;
            spans.push(Span {
                start,
                end: digit_start + 1,
            });
            search_start = digit_start + 1;
        }
    }

    for (word, priority_value) in [
        ("很紧急", 5),
        ("緊急", 5),
        ("紧急", 5),
        ("很重要", 4),
        ("重要", 4),
    ] {
        let mut search_start = 0;
        while let Some(offset) = value_find(value, word, search_start) {
            priority = priority_value;
            spans.push(Span {
                start: offset,
                end: offset + word.len(),
            });
            search_start = offset + word.len();
        }
    }

    priority
}

fn first_priority_digit(value: &str, start: usize) -> Option<(usize, u8)> {
    for (offset, ch) in value[start..].char_indices() {
        if ch.is_whitespace() {
            continue;
        }
        let digit = ch.to_digit(10)? as u8;
        if (1..=5).contains(&digit) {
            return Some((start + offset, digit));
        }
        return None;
    }
    None
}

fn value_find(value: &str, needle: &str, start: usize) -> Option<usize> {
    value[start..].find(needle).map(|offset| start + offset)
}

fn has_priority_boundaries(value: &str, start: usize, end: usize) -> bool {
    let previous = if start == 0 {
        None
    } else {
        value[..start].chars().next_back()
    };
    let next = value[end..].chars().next();
    previous.is_none_or(is_separator) && next.is_none_or(is_separator)
}

fn parse_date_text(text: &str, today: &RosettaDateTime) -> Option<String> {
    let normalized = text.trim();
    parse_manual_date(normalized, today).or_else(|| parse_with_rosetta(normalized, today))
}

fn parse_manual_date(text: &str, today: &RosettaDateTime) -> Option<String> {
    let compact = text.split_whitespace().collect::<String>();
    if compact.contains("大后天") || compact.contains("大後天") {
        return Some(format_date(today.clone().add_days(3)));
    }
    if compact.contains("后天") || compact.contains("後天") {
        return Some(format_date(today.clone().add_days(2)));
    }
    if compact.contains("明天") || compact.contains("明日") {
        return Some(format_date(today.clone().add_days(1)));
    }
    if compact.contains("今天") || compact.contains("今日") {
        return Some(format_date(today.clone()));
    }
    if compact.contains("昨天") || compact.contains("昨日") {
        return Some(format_date(today.clone().add_days(-1)));
    }
    if compact.contains("前天") || compact.contains("前日") {
        return Some(format_date(today.clone().add_days(-2)));
    }
    if let Some(date) = parse_chinese_weekday(&compact, today) {
        return Some(date);
    }
    if let Some(date) = parse_english_weekday(text, today) {
        return Some(date);
    }
    if let Some(date) = parse_chinese_month_day(&compact, today) {
        return Some(date);
    }
    if let Some(date) = parse_short_month_day(&compact, today) {
        return Some(date);
    }
    None
}

fn parse_english_weekday(text: &str, today: &RosettaDateTime) -> Option<String> {
    let lower = text.trim().to_lowercase();
    let normalized = lower.split_whitespace().collect::<Vec<_>>();
    let weekday_word = normalized.last().copied()?;
    let weekday = english_weekday_index(weekday_word)?;
    let today_weekday = today.weekday() as i64;
    let mut days = weekday as i64 - today_weekday;

    let modifier = normalized.first().copied().unwrap_or_default();
    if modifier == "last" {
        if days >= 0 {
            days -= 7;
        }
    } else if modifier == "next" {
        if days <= 0 {
            days += 7;
        }
    } else if days < 0 {
        days += 7;
    }

    Some(format_date(today.clone().add_days(days)))
}

fn english_weekday_index(value: &str) -> Option<u8> {
    match value.trim_end_matches('.') {
        "monday" | "mon" => Some(0),
        "tuesday" | "tue" | "tues" => Some(1),
        "wednesday" | "wed" => Some(2),
        "thursday" | "thu" | "thur" | "thurs" => Some(3),
        "friday" | "fri" => Some(4),
        "saturday" | "sat" => Some(5),
        "sunday" | "sun" => Some(6),
        _ => None,
    }
}

fn parse_chinese_weekday(text: &str, today: &RosettaDateTime) -> Option<String> {
    let matched = CHINESE_WEEKDAY_RE.find(text)?;
    let weekday_text = matched.as_str().split_whitespace().collect::<String>();
    let weekday = weekday_text
        .chars()
        .next_back()
        .and_then(chinese_weekday_index)?;
    let today_weekday = today.weekday() as i64;
    let mut days = weekday as i64 - today_weekday;

    if weekday_text.contains('上') {
        if days >= 0 {
            days -= 7;
        }
    } else if weekday_text.contains('下') {
        if days <= 0 {
            days += 7;
        }
    } else if days < 0 {
        days += 7;
    }

    Some(format_date(today.clone().add_days(days)))
}

fn chinese_weekday_index(ch: char) -> Option<u8> {
    match ch {
        '一' => Some(0),
        '二' => Some(1),
        '三' => Some(2),
        '四' => Some(3),
        '五' => Some(4),
        '六' => Some(5),
        '日' | '天' => Some(6),
        _ => None,
    }
}

fn parse_chinese_month_day(text: &str, today: &RosettaDateTime) -> Option<String> {
    let captures = Regex::new(r"^(?:(\d{2,4})年)?(\d{1,2})月(\d{1,2})(?:日|号|號)?")
        .ok()?
        .captures(text)?;
    let year = if let Some(value) = captures.get(1) {
        Some(normalize_year(value.as_str())?)
    } else {
        None
    };
    let month = captures.get(2)?.as_str().parse::<u8>().ok()?;
    let day = captures.get(3)?.as_str().parse::<u8>().ok()?;

    let mut resolved_year = year.unwrap_or_else(|| today.year());
    let mut date =
        RosettaDateTime::from_components(resolved_year, month, day, 12, 0, 0, LOCAL_TZ).ok()?;
    if year.is_none() && date < *today {
        resolved_year += 1;
        date =
            RosettaDateTime::from_components(resolved_year, month, day, 12, 0, 0, LOCAL_TZ).ok()?;
    }

    Some(format_date(date))
}

fn parse_short_month_day(text: &str, today: &RosettaDateTime) -> Option<String> {
    let captures = Regex::new(r"^(\d{1,2})/(\d{1,2})$").ok()?.captures(text)?;
    let month = captures.get(1)?.as_str().parse::<u8>().ok()?;
    let day = captures.get(2)?.as_str().parse::<u8>().ok()?;
    let mut year = today.year();
    let mut date = RosettaDateTime::from_components(year, month, day, 12, 0, 0, LOCAL_TZ).ok()?;
    if date < *today {
        year += 1;
        date = RosettaDateTime::from_components(year, month, day, 12, 0, 0, LOCAL_TZ).ok()?;
    }
    Some(format_date(date))
}

fn normalize_year(value: &str) -> Option<i32> {
    let year = value.parse::<i32>().ok()?;
    if year < 100 {
        Some(2000 + year)
    } else {
        Some(year)
    }
}

fn parse_with_rosetta(text: &str, today: &RosettaDateTime) -> Option<String> {
    let options = ParseOptions {
        languages: Some(vec![&i18n::zh::CHINESE, &i18n::en::ENGLISH]),
        default_tz: LOCAL_TZ,
        base_time: Some(today.clone()),
        ..Default::default()
    };
    let parsed = parse_with_options(text, &options).ok()?;
    Some(format_date(parsed))
}

fn base_datetime(today: &str) -> Option<RosettaDateTime> {
    let mut parts = today.split('-');
    let year = parts.next()?.parse::<i32>().ok()?;
    let month = parts.next()?.parse::<u8>().ok()?;
    let day = parts.next()?.parse::<u8>().ok()?;
    if parts.next().is_some() {
        return None;
    }
    RosettaDateTime::from_components(year, month, day, 12, 0, 0, LOCAL_TZ).ok()
}

fn format_date(date: RosettaDateTime) -> String {
    format!("{:04}-{:02}-{:02}", date.year(), date.month(), date.day())
}

fn strip_spans(value: &str, spans: &[Span]) -> String {
    if spans.is_empty() {
        return value.trim().to_string();
    }

    let mut sorted = spans.to_vec();
    sorted.sort_by_key(|span| span.start);

    let mut output = String::with_capacity(value.len());
    let mut cursor = 0;
    for span in sorted {
        if span.start < cursor || span.start > value.len() || span.end > value.len() {
            continue;
        }
        output.push_str(&value[cursor..span.start]);
        cursor = span.end;
    }
    output.push_str(&value[cursor..]);
    tidy_content(&output)
}

fn tidy_content(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let mut previous_was_space = false;

    for ch in value.chars() {
        if ch.is_whitespace() {
            if !previous_was_space {
                output.push(' ');
            }
            previous_was_space = true;
        } else {
            output.push(ch);
            previous_was_space = false;
        }
    }

    output
        .trim_matches(is_separator)
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn trim_left_separators(value: &str, end: usize) -> usize {
    let mut cursor = end;
    while cursor > 0 {
        let Some((index, ch)) = value[..cursor].char_indices().next_back() else {
            break;
        };
        if !is_separator(ch) {
            break;
        }
        cursor = index;
    }
    cursor
}

fn is_separator(ch: char) -> bool {
    ch.is_whitespace()
        || matches!(
            ch,
            ',' | '，' | '.' | '。' | ';' | '；' | ':' | '：' | '-' | '—' | '、'
        )
}

fn overlaps_any(span: Span, spans: &[Span]) -> bool {
    spans
        .iter()
        .any(|existing| span.start < existing.end && existing.start < span.end)
}

#[cfg(test)]
mod tests {
    use super::parse_quick_add;

    fn parse(value: &str) -> super::QuickAddResult {
        parse_quick_add(value, "2026-07-05", None, None, 3).expect("parse quick add")
    }

    #[test]
    fn parses_plain_chinese_tomorrow_as_planned_date() {
        let parsed = parse("买牛奶 明天");
        assert_eq!(parsed.content, "买牛奶");
        assert_eq!(parsed.planned_date.as_deref(), Some("2026-07-06"));
        assert_eq!(parsed.due_date, None);
        assert_eq!(parsed.priority, 3);
    }

    #[test]
    fn parses_deadline_weekday_and_priority() {
        let parsed = parse("交报告 截止周五 !2");
        assert_eq!(parsed.content, "交报告");
        assert_eq!(parsed.planned_date, None);
        assert_eq!(parsed.due_date.as_deref(), Some("2026-07-10"));
        assert_eq!(parsed.priority, 2);
    }

    #[test]
    fn parses_next_weekday_time_and_p_priority() {
        let parsed = parse("下周三下午3点 复诊 p5");
        assert_eq!(parsed.content, "复诊");
        assert_eq!(parsed.planned_date.as_deref(), Some("2026-07-08"));
        assert_eq!(parsed.priority, 5);
    }

    #[test]
    fn parses_absolute_chinese_date() {
        let parsed = parse("7月10日 还书");
        assert_eq!(parsed.content, "还书");
        assert_eq!(parsed.planned_date.as_deref(), Some("2026-07-10"));
    }

    #[test]
    fn due_date_wins_when_explicit_dates_conflict() {
        let parsed = parse_quick_add(
            "买牛奶 明天 截止周五 !4",
            "2026-07-05",
            Some("2026-08-01".to_string()),
            Some("2026-08-02".to_string()),
            3,
        )
        .expect("parse quick add");
        assert_eq!(parsed.content, "买牛奶");
        assert_eq!(parsed.planned_date, None);
        assert_eq!(parsed.due_date.as_deref(), Some("2026-08-02"));
        assert_eq!(parsed.priority, 4);
    }

    #[test]
    fn parsed_due_date_suppresses_explicit_planned_date() {
        let parsed = parse_quick_add(
            "叫报名 截止今天",
            "2026-07-05",
            Some("2026-07-05".to_string()),
            None,
            3,
        )
        .expect("parse quick add");
        assert_eq!(parsed.content, "叫报名");
        assert_eq!(parsed.planned_date, None);
        assert_eq!(parsed.due_date.as_deref(), Some("2026-07-05"));
    }

    #[test]
    fn preserves_invalid_priority() {
        let parsed = parse("整理 !9");
        assert_eq!(parsed.content, "整理 !9");
        assert_eq!(parsed.priority, 3);
    }

    #[test]
    fn maps_priority_words() {
        let parsed = parse("紧急 处理账单");
        assert_eq!(parsed.content, "处理账单");
        assert_eq!(parsed.priority, 5);
    }

    #[test]
    fn rolls_short_month_day_to_next_year_when_past() {
        let parsed = parse("7/3 复盘");
        assert_eq!(parsed.content, "复盘");
        assert_eq!(parsed.planned_date.as_deref(), Some("2027-07-03"));
    }
}
