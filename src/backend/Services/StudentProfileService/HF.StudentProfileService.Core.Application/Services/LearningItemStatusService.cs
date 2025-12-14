using HF.StudentProfileService.Core.Domain.DTO;
using HF.StudentProfileService.Core.Domain.Entities;
using HF.StudentProfileService.Core.Domain.Interfaces.Repositories;
using HF.StudentProfileService.Core.Domain.Interfaces.Services;

namespace HF.StudentProfileService.Core.Application.Services;

public class LearningItemStatusService : ILearningItemStatusService
{
    private readonly IStudentRepository _studentRepository;
    private readonly ILearningItemStatusRepository _learningItemStatusRepository;

    public LearningItemStatusService(
        IStudentRepository studentRepository,
        ILearningItemStatusRepository learningItemStatusRepository)
    {
        _studentRepository = studentRepository;
        _learningItemStatusRepository = learningItemStatusRepository;
    }

    public async Task UpdateLearningItemStatusAsync(UpdateLearningItemStatusRequest request, CancellationToken cancellationToken = default)
    {
        var student = await _studentRepository.GetByUserIdAsync(request.UserId, cancellationToken);

        if (student == null)
        {
            student = new Student
            {
                Id = Guid.NewGuid(),
                UserId = request.UserId
            };
            await _studentRepository.AddAsync(student, cancellationToken);
        }

        var existingStatus = await _learningItemStatusRepository.GetByStudentAndItemAsync(
            student.Id,
            request.LearningItemId,
            request.LearningItemType,
            cancellationToken);

        if (existingStatus != null)
        {
            existingStatus.IsCompleted = request.IsCompleted;
            existingStatus.DateTime = DateTime.UtcNow;
            await _learningItemStatusRepository.UpdateAsync(existingStatus, cancellationToken);
        }
        else
        {
            var newStatus = new LearningItemStatus
            {
                Id = Guid.NewGuid(),
                LearningItemId = request.LearningItemId,
                LearningItemType = request.LearningItemType,
                IsCompleted = request.IsCompleted,
                DateTime = DateTime.UtcNow,
                Student = student
            };
            await _learningItemStatusRepository.AddAsync(newStatus, cancellationToken);
        }
    }

    public async Task<IList<LearningItemStatusDto>> GetLearningItemStatusesAsync(GetLearningItemStatusesRequest request, CancellationToken cancellationToken = default)
    {
        var student = await _studentRepository.GetByUserIdAsync(request.UserId, cancellationToken);

        if (student == null || !request.Items.Any())
        {
            return request.Items.Select(item => new LearningItemStatusDto
            {
                LearningItemId = item.LearningItemId,
                IsCompleted = false,
                Score = null
            }).ToList();
        }

        var items = request.Items.Select(item => (item.LearningItemId, item.LearningItemType)).ToList();
        var statuses = await _learningItemStatusRepository.GetByStudentAndMultipleItemsAsync(
            student.Id,
            items,
            cancellationToken);

        var statusMap = statuses.ToDictionary(s => (s.LearningItemId, s.LearningItemType), s => s);

        return request.Items.Select(item =>
        {
            var status = statusMap.GetValueOrDefault((item.LearningItemId, item.LearningItemType));
            return new LearningItemStatusDto
            {
                LearningItemId = item.LearningItemId,
                IsCompleted = status?.IsCompleted ?? false,
                Score = status?.Score
            };
        }).ToList();
    }
}

