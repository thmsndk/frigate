from frigate.util.classification_similarity import (
    compute_suggested_action,
    hash_similarity,
    parse_train_filename,
)


class TestClassificationSimilarity:
    def test_parse_train_filename(self):
        parsed = parse_train_filename("none-none-1783796807.881858-package-0.67.webp")
        assert parsed is not None
        assert parsed["predicted_label"] == "package"
        assert parsed["confidence"] == 0.67
        assert parsed["timestamp"] == 1783796807.881858

    def test_parse_train_filename_invalid(self):
        assert parse_train_filename("example_001.jpg") is None

    def test_hash_similarity_identical(self):
        value = "a" * 16
        assert hash_similarity(value, value) == 1.0

    def test_hash_similarity_different(self):
        assert hash_similarity("0" * 16, "f" * 16) == 0.0

    def test_compute_suggested_action_library_duplicate(self):
        action = compute_suggested_action(0.95, 0.95, 0.2, 0.2, "clear")
        assert action == "skip_duplicate_library"

    def test_compute_suggested_action_recent_duplicate(self):
        action = compute_suggested_action(0.95, 0.875, 1.0, 0.2, "clear")
        assert action == "skip_duplicate_recent"

    def test_compute_suggested_action_library_beats_recent(self):
        action = compute_suggested_action(0.95, 0.95, 1.0, 0.2, "clear")
        assert action == "skip_duplicate_library"

    def test_compute_suggested_action_mislabel(self):
        action = compute_suggested_action(0.67, 0.4, 0.2, 0.91, "clear")
        assert action == "relabel_to_clear"

    def test_compute_suggested_action_new_scenario(self):
        action = compute_suggested_action(0.67, 0.2, 0.2, 0.3, "clear")
        assert action == "add_new_scenario"

    def test_compute_suggested_action_add(self):
        action = compute_suggested_action(0.92, 0.75, 0.2, 0.4, "clear")
        assert action == "add"

    def test_compute_suggested_action_review(self):
        action = compute_suggested_action(0.72, 0.75, 0.2, 0.4, "clear")
        assert action == "review"
