// Rule-based wellness engine
// Input: mood + answers → Output: insights + matched therapist tags

const Therapist = require('../models/Therapist');

// Maps mood + concern combos to therapist specialization tags
const ruleEngine = (mood, concerns) => {
    const tags = new Set();
    const insights = [];

    if (mood === 'awful' || mood === 'low') {
        tags.add('Depression'); tags.add('Emotional Healing');
        insights.push('You seem to be going through a difficult time. Talking to someone can really help.');
    }
    if (mood === 'anxious' || concerns.includes('anxiety')) {
        tags.add('Anxiety'); tags.add('CBT');
        insights.push('Anxiety is very common and very treatable. A therapist can teach you techniques to manage it.');
    }
    if (concerns.includes('sleep')) {
        tags.add('Sleep Issues'); tags.add('Mindfulness');
        insights.push('Poor sleep often signals underlying stress. A therapist specializing in sleep can help.');
    }
    if (concerns.includes('overthinking') || concerns.includes('burnout')) {
        tags.add('Overthinking'); tags.add('Burnout'); tags.add('DBT');
        insights.push('Overthinking and burnout are signs your mind needs rest and support.');
    }
    if (concerns.includes('stress') || concerns.includes('work')) {
        tags.add('Stress'); tags.add('CBT');
        insights.push('Chronic stress affects your health. Learning coping strategies can change your daily life.');
    }
    if (concerns.includes('relationship') || concerns.includes('self-esteem')) {
        tags.add('Self-esteem'); tags.add('Emotional Healing');
        insights.push('Relationship and self-worth challenges are areas where therapy shows strong results.');
    }

    // default if nothing matched
    if (tags.size === 0) {
        tags.add('Stress'); tags.add('Emotional Healing');
        insights.push('Everyone needs support sometimes. A therapist can help you find clarity.');
    }

    return { tags: [...tags], insights };
};

// POST /api/wellness/assess
const assess = async (req, res) => {
    try {
        const { mood, concerns = [], language, budget } = req.body;
        // concerns is an array like ['anxiety', 'sleep', 'work']

        const { tags, insights } = ruleEngine(mood, concerns);

        // Build query for matching therapists
        let query = { available: true, isVerified: true };

        // Match by at least one tag
        if (tags.length > 0) {
            query.tags = { $in: tags };
        }

        // Match by language if provided
        if (language && language !== 'any') {
            query.languages = language;
        }

        // Match by budget (session fee)
        if (budget) {
            query.sessionFee = { $lte: Number(budget) };
        }

        // Get matched therapists sorted by rating
        let matched = await Therapist.find(query).sort({ rating: -1 });

        // Fallback — if no match, return all available
        if (matched.length === 0) {
            matched = await Therapist.find({ available: true, isVerified: true }).sort({ rating: -1 });
        }

        res.json({ insights, matchedTherapists: matched, tags });

    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = { assess };