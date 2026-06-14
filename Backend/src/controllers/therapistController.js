const Therapist = require('../models/Therapist');
const TherapistUser = require('../models/TherapistUser');
const Availability = require('../models/Availability');

exports.getProfile = async (req, res) => {
  try {
    const profile = await Therapist.findOne({ userId: req.therapistId });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });
    res.json({ success: true, data: profile });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.saveOnboarding = async (req, res) => {
  console.log('--- saveOnboarding Start ---');
  console.log('User ID:', req.therapistId);
  console.log('Body:', JSON.stringify(req.body));
  
  try {
    const { 
        fullName, phone, gender, bio, licenseNumber, yearsOfExperience, education,
        specialties, languages, sessionTypes, sessionFee, sessionDuration,
        bankAccountName, bankAccountNumber, bankIFSC, upiId 
    } = req.body;

    if (!fullName || !specialties || !sessionFee || !sessionTypes) {
        console.warn('Onboarding: Missing required fields');
        return res.status(400).json({ 
            success: false, 
            message: 'Full name, specialties, session types and fee are required.' 
        });
    }

    const therapistUser = await TherapistUser.findById(req.therapistId).select('email');
    if (!therapistUser) {
        console.warn('Onboarding: TherapistUser not found');
        return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const profileData = {
      userId: req.therapistId,
      email: therapistUser.email,
      fullName: fullName.trim(),
      phone: phone || '',
      gender: gender || undefined,
      bio: bio || '',
      licenseNumber: licenseNumber || '',
      yearsOfExperience: Number(yearsOfExperience) || 0,
      education: education || [],
      // Ensure specialties/languages/types are clean arrays
      specialties: specialties && (Array.isArray(specialties) ? specialties : [specialties]) || [],
      languages: languages && (Array.isArray(languages) ? languages : [languages]) || [],
      sessionTypes: sessionTypes && (Array.isArray(sessionTypes) ? sessionTypes : [sessionTypes]) || [],
      sessionFee: Number(sessionFee) || 500,
      sessionDuration: Number(sessionDuration) || 60,
      bankAccountName: bankAccountName || '',
      bankAccountNumber: bankAccountNumber || '',
      bankIFSC: bankIFSC || '',
      upiId: upiId || '',
      onboardingComplete: true,
    };

    console.log('Attempting save with data:', JSON.stringify(profileData));

    const profile = await Therapist.findOneAndUpdate(
      { userId: req.therapistId },
      profileData,
      { new: true, upsert: true, runValidators: true }
    );
    
    console.log('Profile saved successfully');
    res.status(200).json({ 
        success: true, 
        message: 'Profile saved! Awaiting admin approval.', 
        data: profile 
    });

  } catch (err) {
    console.error('CRITICAL ONBOARDING ERROR:', err);
    
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ success: false, message: 'Validation failed: ' + messages.join(', ') });
    }
    
    if (err.name === 'CastError') {
        return res.status(400).json({ success: false, message: `Invalid data type for field: ${err.path}` });
    }

    res.status(500).json({ 
        success: false, 
        message: 'Server error: ' + err.message,
        debug_stack: err.stack
    });
  }
};

exports.getOnboardingStatus = async (req, res) => {
  try {
    const profile = await Therapist.findOne({ userId: req.therapistId })
      .select('onboardingComplete isApproved fullName');
    if (!profile) return res.json({ success: true, onboardingComplete: false, isApproved: false });
    
    res.json({
      success: true,
      onboardingComplete: profile.onboardingComplete,
      isApproved: profile.isApproved,
      fullName: profile.fullName
    });
  } catch (err) { 
    console.error('Status check error:', err);
    res.status(500).json({ success: false, message: 'Server error' }); 
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const allowed = [
        'fullName', 'phone', 'gender', 'bio', 'licenseNumber', 'yearsOfExperience',
        'education', 'specialties', 'languages', 'sessionTypes', 'sessionFee', 'sessionDuration',
        'bankAccountName', 'bankAccountNumber', 'bankIFSC', 'upiId'
    ];
    const updates = {};
    for (const f of allowed) {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
    }

    const profile = await Therapist.findOneAndUpdate(
      { userId: req.therapistId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });
    res.json({ success: true, data: profile });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.browseTherapists = async (req, res) => {
  try {
    const { specialty, sessionType, language, minFee, maxFee, search, sort, page = 1, limit = 9 } = req.query;

    const query = { isApproved: true, onboardingComplete: true };

    if (specialty) query.specialties = specialty;
    if (sessionType) query.sessionTypes = sessionType;
    if (language) query.languages = language;
    if (minFee || maxFee) {
        query.sessionFee = {};
        if (minFee) query.sessionFee.$gte = Number(minFee);
        if (maxFee) query.sessionFee.$lte = Number(maxFee);
    }
    if (search) {
        query.$or = [
            { fullName: { $regex: search, $options: 'i' } },
            { bio: { $regex: search, $options: 'i' } }
        ];
    }

    let sortOption = { averageRating: -1 };
    if (sort === 'fee_low') sortOption = { sessionFee: 1 };
    if (sort === 'fee_high') sortOption = { sessionFee: -1 };
    if (sort === 'rating') sortOption = { averageRating: -1 };
    if (sort === 'exp') sortOption = { yearsOfExperience: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    
    const [therapists, total] = await Promise.all([
        Therapist.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(Number(limit))
            .select('fullName bio profilePhoto specialties languages sessionFee averageRating totalReviews yearsOfExperience sessionTypes isOnline')
            .lean(),
        Therapist.countDocuments(query)
    ]);

    res.json({
        success: true,
        data: {
            therapists,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        }
    });
  } catch (err) {
    console.error('Browse therapists error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/therapists/:id — Public, fetch single therapist by Therapist document _id
exports.getTherapistById = async (req, res) => {
  try {
    const therapist = await Therapist.findById(req.params.id)
      .select('fullName bio profilePhoto specialties languages sessionFee sessionDuration averageRating totalReviews yearsOfExperience sessionTypes isOnline isApproved onboardingComplete')
      .lean();

    if (!therapist) {
      return res.status(404).json({ success: false, message: 'Therapist not found.' });
    }
    if (!therapist.onboardingComplete) {
      return res.status(403).json({ success: false, message: 'Therapist profile is not available.' });
    }

    res.json({ success: true, data: therapist });
  } catch (err) {
    console.error('getTherapistById error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getSimpleList = async (req, res) => {
  try {
    const list = await Therapist.find({ isApproved: true, onboardingComplete: true })
        .sort({ averageRating: -1 })
        .limit(20)
        .select('fullName bio profilePhoto specialties languages sessionFee averageRating totalReviews yearsOfExperience sessionTypes isOnline')
        .lean();
    
    // Map internal field names to what script.js expects if necessary
    const mapped = list.map(t => ({
        ...t,
        name: t.fullName, // script.js uses .name
        specialization: t.specialties ? t.specialties.join(', ') : '',
        experience: t.yearsOfExperience + ' years',
        role: t.specialties ? t.specialties[0] : 'Therapist'
    }));

    res.json(mapped);
  } catch (err) {
    console.error('Get simple list error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.toggleOnline = async (req, res) => {
  try {
    const { isOnline } = req.body;
    const profile = await Therapist.findOneAndUpdate(
      { userId: req.therapistId },
      { isOnline },
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });
    res.json({ success: true, isOnline: profile.isOnline });
  } catch (err) {
    console.error('Toggle online error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/therapist/onboarding-status — THERAPIST AUTH
exports.getOnboardingStatus = async (req, res) => {
  try {
    const profile = await Therapist.findOne({ userId: req.therapistId })
      .select('onboardingComplete fullName');

    if (!profile) {
      return res.json({
        success: true,
        data: { onboardingComplete: false }
      });
    }

    res.json({
      success: true,
      data: {
        onboardingComplete: !!profile.onboardingComplete,
        fullName: profile.fullName
      }
    });
  } catch (err) {
    console.error('getOnboardingStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};