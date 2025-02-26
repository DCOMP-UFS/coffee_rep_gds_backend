package br.ufs.coffee_rep_gds_backend.services.domain;

import br.ufs.coffee_rep_gds_backend.entities.RequesterType;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.repositories.RequesterTypeRepository;
import br.ufs.coffee_rep_gds_backend.utils.CurrentUserUtils;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class RequesterTypeDomainService {

    private final RequesterTypeRepository requesterTypeRepository;
    private final UserDomainService userDomainService;

    public RequesterTypeDomainService(RequesterTypeRepository requesterTypeRepository, UserDomainService userDomainService) {
        this.requesterTypeRepository = requesterTypeRepository;
        this.userDomainService = userDomainService;
    }

    public Optional<RequesterType> findById(Long id) {
        return requesterTypeRepository.findById(id);
    }

    public RequesterType createRequesterType(String name, String position) {
        Optional<RequesterType> optional = requesterTypeRepository.findByNameIgnoreCaseAndPositionIgnoreCase(name, position);
        User user = userDomainService.findByID(CurrentUserUtils.getCurrentUserID());

        if (optional.isPresent()) {
            return optional.get();
        }

        RequesterType requesterType = new RequesterType(name, position, user, Status.ACTIVE.value);
        return requesterTypeRepository.save(requesterType);
    }
}
